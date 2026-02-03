import React from 'react';
import { View, TextInput as RNTextInput, Text, StyleSheet } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/constants';

const TextInput = ({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  icon,
  rightIcon,
  onRightIconPress,
  secureTextEntry,
  multiline,
  numberOfLines = 3,
  ...props
}) => {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputContainer, error && styles.inputError]}>
        {icon && (
          <Ionicons name={icon} size={20} color={COLORS.neutral[400]} style={styles.leftIcon} />
        )}
        <RNTextInput
          style={[
            styles.input,
            multiline && styles.multiline,
            icon && styles.inputWithLeftIcon,
            rightIcon && styles.inputWithRightIcon,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.neutral[400]}
          secureTextEntry={secureTextEntry}
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines : 1}
          textAlignVertical={multiline ? 'top' : 'center'}
          {...props}
        />
        {rightIcon && (
          <Ionicons
            name={rightIcon}
            size={20}
            color={COLORS.neutral[400]}
            style={styles.rightIcon}
            onPress={onRightIconPress}
          />
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.neutral[700],
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.neutral[300],
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: COLORS.neutral[900],
  },
  multiline: {
    height: 80,
    paddingTop: 12,
  },
  inputWithLeftIcon: {
    paddingLeft: 8,
  },
  inputWithRightIcon: {
    paddingRight: 8,
  },
  leftIcon: {
    marginLeft: 12,
  },
  rightIcon: {
    marginRight: 12,
  },
  inputError: {
    borderColor: COLORS.error[500],
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error[600],
    marginTop: 4,
  },
});

export default TextInput;
