/**
 * Safe Math Expression Evaluator
 * 
 * This module provides a secure way to evaluate mathematical expressions
 * without using eval() or Function() directly on untrusted input.
 */

interface EvaluationResult {
  value?: number;
  error?: string;
}

/**
 * Tokenize a mathematical expression
 */
function tokenize(expression: string): string[] {
  const tokens: string[] = [];
  let current = "";
  
  for (let i = 0; i < expression.length; i++) {
    const char = expression[i];
    
    if (char === " ") {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }
    
    if ("+-*/^()".includes(char)) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      tokens.push(char);
    } else if (/[0-9.]/.test(char)) {
      current += char;
    } else {
      // Invalid character
      throw new Error(`Invalid character in expression: ${char}`);
    }
  }
  
  if (current) {
    tokens.push(current);
  }
  
  return tokens;
}

/**
 * Parse and evaluate using recursive descent parser
 * Handles: +, -, *, /, ^ (exponent), parentheses
 */
class MathParser {
  private tokens: string[];
  private pos: number;

  constructor(tokens: string[]) {
    this.tokens = tokens;
    this.pos = 0;
  }

  private peek(): string | null {
    return this.pos < this.tokens.length ? this.tokens[this.pos] : null;
  }

  private consume(): string {
    return this.tokens[this.pos++];
  }

  // Entry point: handles addition and subtraction
  parse(): number {
    return this.parseAddSub();
  }

  private parseAddSub(): number {
    let left = this.parseMulDiv();

    while (this.peek() === "+" || this.peek() === "-") {
      const op = this.consume();
      const right = this.parseMulDiv();
      left = op === "+" ? left + right : left - right;
    }

    return left;
  }

  private parseMulDiv(): number {
    let left = this.parsePower();

    while (this.peek() === "*" || this.peek() === "/") {
      const op = this.consume();
      const right = this.parsePower();
      if (op === "/" && right === 0) {
        throw new Error("Division by zero");
      }
      left = op === "*" ? left * right : left / right;
    }

    return left;
  }

  private parsePower(): number {
    let left = this.parseUnary();

    if (this.peek() === "^") {
      this.consume();
      const right = this.parsePower(); // Right associative
      left = Math.pow(left, right);
    }

    return left;
  }

  private parseUnary(): number {
    if (this.peek() === "-") {
      this.consume();
      return -this.parseUnary();
    }
    if (this.peek() === "+") {
      this.consume();
      return this.parseUnary();
    }
    return this.parsePrimary();
  }

  private parsePrimary(): number {
    const token = this.peek();

    if (token === "(") {
      this.consume(); // consume '('
      const value = this.parseAddSub();
      if (this.peek() !== ")") {
        throw new Error("Missing closing parenthesis");
      }
      this.consume(); // consume ')'
      return value;
    }

    if (token && /^-?\d+\.?\d*$/.test(token)) {
      this.consume();
      return parseFloat(token);
    }

    throw new Error(`Unexpected token: ${token}`);
  }
}

/**
 * Safely evaluate a mathematical expression
 * 
 * @param expression - The mathematical expression to evaluate
 * @returns The result or an error
 */
export function safeEvaluate(expression: string): EvaluationResult {
  try {
    // Validate expression doesn't contain dangerous patterns
    if (/[a-zA-Z_$]/.test(expression.replace(/\s/g, ""))) {
      // Check for allowed patterns only
      const cleaned = expression.replace(/\s/g, "");
      if (!/^[\d+\-*/^().]+$/.test(cleaned)) {
        return { error: "Expression contains invalid characters" };
      }
    }

    const tokens = tokenize(expression);
    
    if (tokens.length === 0) {
      return { error: "Empty expression" };
    }

    const parser = new MathParser(tokens);
    const result = parser.parse();

    if (!isFinite(result)) {
      return { error: "Result is not a finite number" };
    }

    // Round to avoid floating point precision issues
    const rounded = Math.round(result * 1000000) / 1000000;
    
    return { value: rounded };
  } catch (error) {
    return { error: (error as Error).message };
  }
}

/**
 * Format a number for display
 */
export function formatNumber(value: number): string {
  if (Number.isInteger(value)) {
    return value.toString();
  }
  // Show up to 4 decimal places, trim trailing zeros
  return parseFloat(value.toFixed(4)).toString();
}

