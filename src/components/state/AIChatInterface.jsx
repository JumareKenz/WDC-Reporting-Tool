import { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  X,
  Sparkles,
  TrendingUp,
  BarChart3,
  FileText,
  Users,
  AlertCircle,
  Lightbulb,
  MessageSquare,
  Loader2,
} from 'lucide-react';
import Button from '../common/Button';

const EXAMPLE_QUESTIONS = [
  {
    icon: TrendingUp,
    question: "What's the overall submission trend?",
    category: "Trends"
  },
  {
    icon: BarChart3,
    question: "Which LGAs need immediate attention?",
    category: "Analysis"
  },
  {
    icon: Users,
    question: "Show me ward engagement statistics",
    category: "Data"
  },
  {
    icon: FileText,
    question: "Summarize this month's reports",
    category: "Reports"
  },
];

const INITIAL_MESSAGE = {
  role: 'assistant',
  content: "Hello! I'm your AI assistant for the Kaduna State WDC Digital Reporting System. I can help you with:\n\n• 📊 **Data Analysis** - Understand submission trends, performance metrics, and patterns\n• 🔍 **Insights** - Get actionable insights from ward reports and LGA performance\n• 📈 **Trends** - Identify trends across wards, LGAs, and time periods\n• 💡 **Recommendations** - Receive data-driven recommendations for improving submission rates\n• ❓ **Questions** - Ask anything about the system data\n\nWhat would you like to know?",
  timestamp: new Date(),
};

const AIChatInterface = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = {
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulate AI response (replace with actual API call)
    setTimeout(() => {
      const aiResponse = generateAIResponse(input);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
      }]);
      setIsTyping(false);
    }, 1500);
  };

  const handleExampleClick = (question) => {
    setInput(question);
  };

  const generateAIResponse = (question) => {
    const lowerQuestion = question.toLowerCase();

    if (lowerQuestion.includes('trend') || lowerQuestion.includes('submission')) {
      return "📈 **Submission Trends Analysis**\n\nBased on the last 6 months:\n\n• **Overall Trend**: Submission rates have increased from 65% to 88%, showing consistent improvement of ~4% per month.\n\n• **Top Performers**: Jaba, Kaduna North, and Zaria maintain 90%+ submission rates consistently.\n\n• **Areas of Concern**: Sanga, Kauru, and Ikara show fluctuating rates and may need targeted support.\n\n• **Prediction**: If the current trend continues, we should reach 92%+ submission rate by next month.\n\nWould you like me to analyze specific LGAs or time periods?";
    }

    if (lowerQuestion.includes('attention') || lowerQuestion.includes('concern') || lowerQuestion.includes('low')) {
      return "⚠️ **LGAs Requiring Immediate Attention**\n\n**Critical Priority:**\n1. **Sanga LGA** - 70% submission rate, 3 wards consistently missing\n2. **Kauru LGA** - 70% submission rate, coordinator position vacant\n\n**Moderate Priority:**\n3. **Ikara LGA** - 70% submission rate, needs follow-up\n4. **Lere LGA** - 73% submission rate, slight improvement needed\n5. **Giwa LGA** - 73% submission rate, capacity building recommended\n\n**Recommended Actions:**\n• Deploy field officers to critical LGAs\n• Organize emergency coordination meetings\n• Provide technical support to secretaries\n• Review and address systemic barriers\n\nWould you like detailed analysis for any specific LGA?";
    }

    if (lowerQuestion.includes('ward') || lowerQuestion.includes('engagement')) {
      return "👥 **Ward Engagement Statistics**\n\n**Overall Metrics:**\n• Total Wards: 255\n• Active Wards: 196 (77%)\n• Average Meetings per Ward: 3.2\n• Average Attendance: 87 participants\n\n**Engagement Categories:**\n• **High Engagement** (5+ meetings): 45 wards (18%)\n• **Good Engagement** (3-4 meetings): 112 wards (44%)\n• **Moderate** (2 meetings): 67 wards (26%)\n• **Low** (<2 meetings): 31 wards (12%)\n\n**Top Engaged Wards:**\n1. Barnawa (Chikun) - 5 meetings, 145 attendees\n2. Kawo (Kaduna North) - 5 meetings, 132 attendees\n3. Kakuri (Kaduna South) - 4 meetings, 128 attendees\n\nWant insights on specific wards or LGAs?";
    }

    if (lowerQuestion.includes('summarize') || lowerQuestion.includes('summary') || lowerQuestion.includes('month')) {
      return "📝 **This Month's Report Summary**\n\n**Overall Performance:**\n• Submission Rate: 88% (↑ 3% from last month)\n• Total Reports: 196 out of 255 wards\n• Reports Reviewed: 156 (80% of submitted)\n• Flagged Reports: 12 (6% of submitted)\n\n**Key Highlights:**\n✅ 4 LGAs achieved 100% submission rate\n✅ Average meeting attendance increased by 12%\n✅ Community engagement scores improved in 18 LGAs\n\n**Common Issues Identified:**\n1. Road infrastructure (mentioned in 34 reports)\n2. Water supply challenges (mentioned in 28 reports)\n3. Healthcare access (mentioned in 21 reports)\n\n**Success Stories:**\n• Barnawa Ward implemented mobile health clinic\n• Tudun Wada completed road rehabilitation\n• Kawo Ward launched youth skills program\n\nWould you like detailed analysis of any specific aspect?";
    }

    if (lowerQuestion.includes('best') || lowerQuestion.includes('top') || lowerQuestion.includes('performer')) {
      return "🏆 **Top Performing LGAs**\n\n**Excellence Tier (95-100%):**\n1. **Jaba LGA** - 100% (9/9 wards)\n2. **Kaduna North** - 100% (8/8 wards)\n\n**Outstanding Tier (90-94%):**\n3. **Zaria** - 92% (12/13 wards)\n4. **Chikun** - 92% (11/12 wards)\n5. **Sabon Gari** - 91% (10/11 wards)\n\n**Success Factors:**\n• Strong coordinator leadership\n• Regular ward secretary training\n• Effective communication systems\n• Community buy-in and support\n\n**Best Practices:**\n• Monthly coordination meetings\n• WhatsApp groups for quick support\n• Recognition programs for top performers\n• Peer mentoring initiatives\n\nWant to learn specific strategies from any of these LGAs?";
    }

    // Default response
    return "I understand you're asking about " + question + ".\n\nI can help you with:\n\n• **Data Analysis** - Trends, patterns, and statistics\n• **Performance Insights** - LGA and ward performance metrics\n• **Recommendations** - Data-driven suggestions for improvement\n• **Comparisons** - Compare LGAs, wards, or time periods\n• **Problem Areas** - Identify and analyze underperforming areas\n\nCould you please be more specific about what aspect you'd like to explore? Or try one of the example questions below!";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200 bg-gradient-to-r from-primary-600 to-purple-600">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg">
              <Bot className="w-7 h-7 text-primary-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                AI Assistant
                <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse" />
              </h2>
              <p className="text-sm text-primary-100">Powered by Advanced Analytics</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            aria-label="Close chat"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-neutral-50 to-white">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`mb-6 flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex gap-3 max-w-[85%] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {/* Avatar */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  message.role === 'user'
                    ? 'bg-primary-100'
                    : 'bg-gradient-to-br from-purple-100 to-blue-100 shadow-md'
                }`}>
                  {message.role === 'user' ? (
                    <Users className="w-5 h-5 text-primary-600" />
                  ) : (
                    <Bot className="w-5 h-5 text-purple-600" />
                  )}
                </div>

                {/* Message Bubble */}
                <div className={`rounded-2xl p-4 shadow-sm ${
                  message.role === 'user'
                    ? 'bg-primary-600 text-white rounded-tr-none'
                    : 'bg-white border border-neutral-200 rounded-tl-none'
                }`}>
                  <div className={`text-sm leading-relaxed whitespace-pre-line ${
                    message.role === 'user' ? 'text-white' : 'text-neutral-800'
                  }`}>
                    {message.content}
                  </div>
                  <p className={`text-xs mt-2 ${
                    message.role === 'user' ? 'text-primary-200' : 'text-neutral-400'
                  }`}>
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center shadow-md">
                <Bot className="w-5 h-5 text-purple-600" />
              </div>
              <div className="bg-white border border-neutral-200 rounded-2xl rounded-tl-none p-4 flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-primary-600 animate-spin" />
                <span className="text-sm text-neutral-600">AI is thinking...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Example Questions */}
        {messages.length === 1 && !isTyping && (
          <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50">
            <p className="text-sm font-medium text-neutral-700 mb-3">Example questions:</p>
            <div className="grid grid-cols-2 gap-2">
              {EXAMPLE_QUESTIONS.map((example, index) => (
                <button
                  key={index}
                  onClick={() => handleExampleClick(example.question)}
                  className="flex items-center gap-2 p-3 bg-white hover:bg-primary-50 border border-neutral-200 hover:border-primary-300 rounded-xl transition-all duration-200 text-left group"
                >
                  <example.icon className="w-4 h-4 text-neutral-400 group-hover:text-primary-600" />
                  <div>
                    <p className="text-xs font-medium text-primary-600">{example.category}</p>
                    <p className="text-sm text-neutral-700 group-hover:text-primary-900">{example.question}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-6 border-t border-neutral-200 bg-white">
          <div className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask me anything about the WDC data..."
              className="flex-1 px-4 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            />
            <Button
              icon={Send}
              onClick={handleSendMessage}
              disabled={!input.trim() || isTyping}
              className="!px-6"
            >
              Send
            </Button>
          </div>
          <p className="text-xs text-neutral-500 mt-2 text-center">
            💡 Tip: Try asking about trends, performance, or specific LGAs
          </p>
        </div>
      </div>
    </div>
  );
};

export default AIChatInterface;
