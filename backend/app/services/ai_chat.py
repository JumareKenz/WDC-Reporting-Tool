"""
AI Chat Service - Handles query classification, SQL generation, and AI responses.
"""
import re
import json
from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import text, inspect
from ..schemas_chat import QueryType, AIQueryResponse, TableData, TableColumn
from ..models import Report, User, LGA, Ward


class AIChatService:
    """Service for processing AI chat queries."""

    # SQL Keywords that indicate database queries
    DB_QUERY_INDICATORS = [
        'show', 'list', 'get', 'find', 'count', 'how many', 'how much',
        'reports', 'users', 'wards', 'lgas', 'submissions', 'statistics',
        'data', 'records', 'summary', 'total', 'average', 'rate',
        'trend', 'compare', 'performance', 'analytics'
    ]

    # General question indicators
    GENERAL_QUERY_INDICATORS = [
        'what is', 'who is', 'when is', 'where is', 'why', 'how to',
        'explain', 'define', 'meaning of', 'weather', 'news', 'help',
        'hello', 'hi', 'thank', 'thanks'
    ]

    # Read-only SQL patterns (whitelist approach)
    ALLOWED_SQL_PATTERNS = [
        r'^\s*SELECT\s+',  # Only SELECT statements
    ]

    # Forbidden SQL keywords
    FORBIDDEN_SQL_KEYWORDS = [
        'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER',
        'TRUNCATE', 'GRANT', 'REVOKE', 'EXECUTE', 'EXEC',
        'UNION', 'INTO OUTFILE', 'LOAD_FILE'
    ]

    def __init__(self, db: Session):
        self.db = db
        self.current_user = None

    def classify_query(self, message: str) -> AIQueryResponse:
        """
        Classify the user query into database or general question.
        
        Returns:
            AIQueryResponse with query type and metadata
        """
        message_lower = message.lower().strip()

        # Check for general question indicators first
        for indicator in self.GENERAL_QUERY_INDICATORS:
            if message_lower.startswith(indicator) or f' {indicator} ' in message_lower:
                return AIQueryResponse(
                    query_type=QueryType.GENERAL,
                    confidence=0.8,
                    explanation="Detected general knowledge question"
                )

        # Check for database query indicators
        db_score = 0
        for indicator in self.DB_QUERY_INDICATORS:
            if indicator in message_lower:
                db_score += 1

        # Check for specific table references
        table_keywords = ['reports', 'users', 'wards', 'lgas', 'submissions']
        for keyword in table_keywords:
            if keyword in message_lower:
                db_score += 2

        if db_score >= 2:
            # Try to generate SQL
            sql_query = self._generate_safe_sql(message)
            if sql_query:
                return AIQueryResponse(
                    query_type=QueryType.DATABASE,
                    confidence=min(0.5 + (db_score * 0.1), 0.95),
                    sql_query=sql_query,
                    explanation="Detected database query intent"
                )

        # Default to general query if uncertain
        return AIQueryResponse(
            query_type=QueryType.GENERAL,
            confidence=0.6,
            explanation="Unclear intent, defaulting to general response"
        )

    def _generate_safe_sql(self, message: str) -> Optional[str]:
        """
        Generate a safe, read-only SQL query from natural language.
        
        This is a simplified implementation. In production, consider using:
        - A proper NLQ-to-SQL model (e.g., SQLCoder, Defog)
        - Strict query templates
        - Query validation before execution
        """
        message_lower = message.lower()

        # Pattern matching for common queries
        # Reports queries
        if 'report' in message_lower:
            if 'last month' in message_lower or 'previous month' in message_lower:
                last_month = (datetime.now().replace(day=1) - timedelta(days=1)).strftime("%Y-%m")
                return f"SELECT r.id, r.report_month, r.status, r.submitted_at, w.name as ward_name, l.name as lga_name FROM reports r JOIN wards w ON r.ward_id = w.id JOIN lgas l ON w.lga_id = l.id WHERE r.report_month = '{last_month}' ORDER BY r.submitted_at DESC LIMIT 100"
            
            if 'this month' in message_lower:
                this_month = datetime.now().strftime("%Y-%m")
                return f"SELECT r.id, r.report_month, r.status, r.submitted_at, w.name as ward_name, l.name as lga_name FROM reports r JOIN wards w ON r.ward_id = w.id JOIN lgas l ON w.lga_id = l.id WHERE r.report_month = '{this_month}' ORDER BY r.submitted_at DESC LIMIT 100"
            
            if 'missing' in message_lower or 'not submitted' in message_lower:
                # This is a complex query - simplified version
                return "SELECT l.name as lga_name, w.name as ward_name FROM wards w JOIN lgas l ON w.lga_id = l.id WHERE NOT EXISTS (SELECT 1 FROM reports r WHERE r.ward_id = w.id AND r.report_month = :current_month) ORDER BY l.name, w.name LIMIT 100"
            
            # Default reports query
            return "SELECT r.id, r.report_month, r.status, r.meetings_held, r.attendees_count, w.name as ward_name, l.name as lga_name FROM reports r JOIN wards w ON r.ward_id = w.id JOIN lgas l ON w.lga_id = l.id ORDER BY r.submitted_at DESC LIMIT 50"

        # User queries
        if 'user' in message_lower or 'secretary' in message_lower or 'coordinator' in message_lower:
            if 'count' in message_lower or 'how many' in message_lower:
                return "SELECT role, COUNT(*) as count FROM users WHERE is_active = true GROUP BY role ORDER BY count DESC"
            
            return "SELECT u.id, u.full_name, u.email, u.role, u.is_active, u.created_at, w.name as ward_name, l.name as lga_name FROM users u LEFT JOIN wards w ON u.ward_id = w.id LEFT JOIN lgas l ON u.lga_id = l.id WHERE u.is_active = true ORDER BY u.created_at DESC LIMIT 50"

        # LGA queries
        if 'lga' in message_lower:
            if 'performance' in message_lower or 'submission rate' in message_lower:
                current_month = datetime.now().strftime("%Y-%m")
                return f"""SELECT l.name as lga_name, COUNT(DISTINCT w.id) as total_wards, 
                    COUNT(DISTINCT r.id) as reports_submitted,
                    ROUND(COUNT(DISTINCT r.id) * 100.0 / NULLIF(COUNT(DISTINCT w.id), 0), 2) as submission_rate
                    FROM lgas l 
                    LEFT JOIN wards w ON l.id = w.lga_id 
                    LEFT JOIN reports r ON w.id = r.ward_id AND r.report_month = '{current_month}'
                    GROUP BY l.id, l.name 
                    ORDER BY submission_rate DESC"""
            
            return "SELECT l.id, l.name, l.code, l.num_wards, COUNT(w.id) as actual_wards FROM lgas l LEFT JOIN wards w ON l.id = w.lga_id GROUP BY l.id ORDER BY l.name"

        # Ward queries
        if 'ward' in message_lower:
            return "SELECT w.id, w.name, w.code, l.name as lga_name, u.full_name as secretary_name FROM wards w JOIN lgas l ON w.lga_id = l.id LEFT JOIN users u ON w.id = u.ward_id AND u.role = 'WDC_SECRETARY' ORDER BY l.name, w.name LIMIT 100"

        # Statistics queries
        if 'statistics' in message_lower or 'summary' in message_lower or 'overview' in message_lower:
            return "SELECT 'Total LGAs' as metric, COUNT(*) as value FROM lgas UNION ALL SELECT 'Total Wards', COUNT(*) FROM wards UNION ALL SELECT 'Total Users', COUNT(*) FROM users WHERE is_active = true UNION ALL SELECT 'Total Reports', COUNT(*) FROM reports"

        return None

    def _validate_sql_safety(self, sql: str) -> bool:
        """
        Validate that SQL query is safe (read-only).
        
        Args:
            sql: SQL query string
            
        Returns:
            True if query is safe, False otherwise
        """
        if not sql:
            return False

        sql_upper = sql.upper()

        # Check for forbidden keywords
        for keyword in self.FORBIDDEN_SQL_KEYWORDS:
            if keyword in sql_upper:
                return False

        # Must start with SELECT
        if not re.match(r'^\s*SELECT\s+', sql_upper):
            return False

        # Additional safety: check for multiple statements
        if ';' in sql and not sql.strip().endswith(';'):
            return False

        return True

    def execute_query(self, sql: str) -> Tuple[bool, Any]:
        """
        Execute a safe SQL query and return results.
        
        Args:
            sql: SQL query string
            
        Returns:
            Tuple of (success, result_or_error)
        """
        if not self._validate_sql_safety(sql):
            return False, "Query failed safety validation. Only SELECT queries are allowed."

        try:
            # Execute query
            result = self.db.execute(text(sql))
            
            # Get column names
            columns = result.keys()
            
            # Fetch rows
            rows = []
            for row in result.fetchall():
                row_dict = {}
                for i, col in enumerate(columns):
                    value = row[i]
                    # Convert datetime to string for JSON serialization
                    if isinstance(value, datetime):
                        value = value.isoformat()
                    row_dict[col] = value
                rows.append(row_dict)

            return True, {
                'columns': list(columns),
                'rows': rows,
                'row_count': len(rows)
            }

        except Exception as e:
            return False, f"Query execution error: {str(e)}"

    def format_as_table(self, query_result: Dict[str, Any]) -> TableData:
        """Format query result as TableData schema."""
        columns = [
            TableColumn(key=col, label=col.replace('_', ' ').title(), type=self._infer_column_type(col))
            for col in query_result['columns']
        ]

        return TableData(
            columns=columns,
            rows=query_result['rows'],
            total_rows=query_result['row_count'],
            page=1,
            page_size=100
        )

    def _infer_column_type(self, column_name: str) -> str:
        """Infer column type based on name."""
        name_lower = column_name.lower()
        if 'date' in name_lower or 'time' in name_lower:
            return 'date'
        if 'count' in name_lower or 'total' in name_lower or 'rate' in name_lower or 'number' in name_lower:
            return 'number'
        if 'is_' in name_lower or 'active' in name_lower:
            return 'boolean'
        return 'string'

    def generate_general_response(self, message: str) -> str:
        """
        Generate a response for general (non-DB) questions.
        
        In production, this would call an external AI service like Grok or OpenAI.
        For now, we provide contextual responses based on the WDC system.
        """
        message_lower = message.lower()

        # Greetings
        if any(word in message_lower for word in ['hello', 'hi', 'hey', 'greetings']):
            return """Hello! 👋 I'm your AI assistant for the Kaduna State WDC Digital Reporting System.

I can help you with:
• 📊 **Database Queries** - Ask about reports, users, wards, LGAs, and statistics
• 📈 **Analytics** - Get insights on submission trends and performance
• 💡 **General Questions** - Learn about the system and its features

What would you like to know?"""

        # Help
        if 'help' in message_lower or 'what can you do' in message_lower:
            return """Here's how I can help you:

**Database Queries:**
• "Show me reports from last month"
• "How many users are registered?"
• "List all LGAs with their submission rates"
• "Which wards haven't submitted this month?"

**Analytics:**
• "What's the overall submission trend?"
• "Compare LGA performance"
• "Show me health data statistics"

**System Information:**
• General questions about how the system works
• Feature explanations

Just ask naturally, and I'll do my best to help!"""

        # System info
        if 'about' in message_lower or 'what is wdc' in message_lower or 'system' in message_lower:
            return """The **Kaduna State WDC Digital Reporting System** is a comprehensive platform for managing Ward Development Committee (WDC) reports across all 23 LGAs and 255 wards in Kaduna State, Nigeria.

**Key Features:**
• 📱 Digital report submission by WDC Secretaries
• 📊 Real-time analytics and dashboards
• 🔔 Automated notifications and reminders
• 🎤 Voice note support for accessibility
• 📈 AI-powered insights and recommendations

**User Roles:**
• WDC Secretaries - Submit monthly reports
• LGA Coordinators - Review ward reports
• State Officials - Oversee all operations and analytics

The system helps improve transparency, accountability, and data-driven decision making for community development."""

        # Default response
        return """I understand you're asking about: "{}"

As an AI assistant for the WDC Reporting System, I can help you:

1. **Query the database** - Ask about reports, users, wards, LGAs, and statistics
2. **Get analytics** - Trends, comparisons, and insights
3. **Learn about the system** - Features, workflows, and best practices

Could you rephrase your question, or try asking about:
• "Show me reports from this month"
• "What are the submission statistics?"
• "List all active users"
• "Help" for more options""".format(message[:100])

    def process_message(self, message: str) -> Dict[str, Any]:
        """
        Main entry point - process a user message and return appropriate response.
        
        Returns:
            Dict with response type, content, and metadata
        """
        # Classify the query
        classification = self.classify_query(message)

        if classification.query_type == QueryType.DATABASE and classification.sql_query:
            # Execute database query
            success, result = self.execute_query(classification.sql_query)
            
            if success:
                table_data = self.format_as_table(result)
                return {
                    'type': 'table',
                    'content': f"Found {result['row_count']} records matching your query.",
                    'table_data': table_data.dict(),
                    'sql_query': classification.sql_query,
                    'explanation': classification.explanation
                }
            else:
                return {
                    'type': 'error',
                    'content': f"I couldn't execute that query. {result}",
                    'explanation': classification.explanation
                }

        # General question
        response_text = self.generate_general_response(message)
        return {
            'type': 'text',
            'content': response_text,
            'explanation': classification.explanation
        }


class QueryTemplate:
    """Predefined safe query templates for common operations."""

    TEMPLATES = {
        'reports_by_month': """
            SELECT r.id, r.report_month, r.status, r.submitted_at,
                   w.name as ward_name, l.name as lga_name
            FROM reports r
            JOIN wards w ON r.ward_id = w.id
            JOIN lgas l ON w.lga_id = l.id
            WHERE r.report_month = :month
            ORDER BY r.submitted_at DESC
            LIMIT :limit
        """,
        'user_stats': """
            SELECT role, COUNT(*) as count
            FROM users
            WHERE is_active = true
            GROUP BY role
            ORDER BY count DESC
        """,
        'lga_performance': """
            SELECT l.name as lga_name,
                   COUNT(DISTINCT w.id) as total_wards,
                   COUNT(DISTINCT r.id) as reports_submitted,
                   ROUND(COUNT(DISTINCT r.id) * 100.0 / NULLIF(COUNT(DISTINCT w.id), 0), 2) as submission_rate
            FROM lgas l
            LEFT JOIN wards w ON l.id = w.lga_id
            LEFT JOIN reports r ON w.id = r.ward_id AND r.report_month = :month
            GROUP BY l.id, l.name
            ORDER BY submission_rate DESC
        """,
        'missing_reports': """
            SELECT l.name as lga_name, w.name as ward_name
            FROM wards w
            JOIN lgas l ON w.lga_id = l.id
            WHERE NOT EXISTS (
                SELECT 1 FROM reports r
                WHERE r.ward_id = w.id AND r.report_month = :month
            )
            ORDER BY l.name, w.name
            LIMIT :limit
        """
    }

    @classmethod
    def get_template(cls, name: str) -> Optional[str]:
        """Get a query template by name."""
        return cls.TEMPLATES.get(name)
