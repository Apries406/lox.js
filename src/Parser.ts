import {
	Binary,
	Comma,
	Conditional,
	Expr,
	Grouping,
	Literal,
	Unary,
} from './Expr';
import { Lox } from './Lox';
import { Token } from './Token';
import { TokenType } from './TokenType';

export class Parser {
	private readonly tokens: Token[];
	private current: number = 0;

	constructor(tokens: Token[]) {
		this.tokens = tokens;
	}

	parse(): Expr {
		try {
			return this.expression();
		} catch (error) {
			return null as unknown as Expr;
		}
	}

	private expression(): Expr {
		console.log('expression');
		return this.comma();
	}

	// comma -> conditional(",", conditional)*
	private comma(): Expr {
		let expr = this.conditional();

		while (this.match([TokenType.COMMA])) {
			if (expr === null) {
				this.reportBinaryOperatorError(TokenType.COMMA);
				this.conditional(); // 解析并丢弃右操作数
			} else {
				const operator = this.previous();
				const right = this.conditional();
				expr = new Comma(expr, operator, right);
			}
		}

		return expr;
	}

	// conditional -> equality ("?" expression ":" conditional)?
	private conditional(): Expr {
		let expr = this.equality();

		if (this.match([TokenType.QUESTION])) {
			if (expr === null) {
				this.reportBinaryOperatorError(TokenType.QUESTION);
				this.expression(); // 解析并丢掉 then
				this.consume(
					TokenType.COLON,
					"Expect ':' after then branch of conditional expression"
				);
				this.conditional(); // 解析丢掉 else
			} else {
				const thenBranch = this.expression();
				this.consume(
					TokenType.COLON,
					"Expect ':' after then branch of conditional expression"
				);
				const elseBranch = this.expression();
				expr = new Conditional(expr as Expr, thenBranch, elseBranch);
			}
		}

		return expr;
	}

	// equality -> comparison(("!=" | "==")comparison)*
	private equality(): Expr {
		console.log('equality');

		let expr: Expr = this.comparison();

		while (this.match([TokenType.BANG_EQUAL, TokenType.EQUAL])) {
			if (expr === null) {
				this.reportBinaryOperatorError(this.previous().type); // 有两个，不确定
				this.comparison(); // 解析并丢弃右操作数
			} else {
				const operator = this.previous();
				const right = this.comparison();
				expr = new Binary(expr, operator, right);
				console.log(expr);
			}
		}

		return expr;
	}

	// comparison -> term((">" | ">=" | "<"| "<=")term)*
	private comparison(): Expr {
		console.log('comparison');

		let expr: Expr = this.term();

		while (
			this.match([
				TokenType.GREATER,
				TokenType.GREATER_EQUAL,
				TokenType.LESS,
				TokenType.LESS_EQUAL,
			])
		) {
			if (expr === null) {
				this.reportBinaryOperatorError(this.previous().type);
				this.term(); // 解析并丢弃右操作数
			} else {
				const operator = this.previous();
				const right = this.term();
				expr = new Binary(expr, operator, right);
			}
		}

		return expr;
	}

	// term -> factor(("-" | "+")factor)*
	private term(): Expr {
		console.log('term');

		let expr = this.factor();

		while (this.match([TokenType.MINUS, TokenType.PLUS])) {
			if (expr === null) {
				this.reportBinaryOperatorError(this.previous().type);
				this.factor(); // 解析并丢弃右操作数
			} else {
				const operator = this.previous();
				const right = this.factor();
				expr = new Binary(expr, operator, right);
			}
		}

		return expr;
	}

	// factor => unary(("/" | "*")unary)*
	private factor(): Expr {
		console.log('factor');

		let expr = this.unary();

		while (this.match([TokenType.SLASH, TokenType.STAR])) {
			if (expr === null) {
				this.reportBinaryOperatorError(this.previous().type);
				this.unary(); // 解析并丢弃右操作数
			} else {
				const operator = this.previous();
				const right = this.factor();
				expr = new Binary(expr, operator, right);
			}
		}

		return expr;
	}

	// unary -> ("!" | "-")unary | primary
	private unary(): Expr {
		console.log('unary');

		if (this.match([TokenType.BANG, TokenType.MINUS])) {
			const operator = this.previous();
			const right = this.unary();
			const expr = new Unary(operator, right);

			return expr;
		}
		return this.primary();
	}

	// primary -> NUMBER | STRING | "true" | "false" | "nil" | "(" expr ")";
	private primary(): Expr {
		console.log('primary');

		if (this.match([TokenType.FALSE])) return new Literal(false);
		if (this.match([TokenType.TRUE])) return new Literal(true);
		if (this.match[TokenType.NIL]) return new Literal(null);

		if (this.match([TokenType.NUMBER, TokenType.STRING])) {
			return new Literal(this.previous().literal);
		}

		if (this.match([TokenType.LEFT_PAREN])) {
			const expr = this.expression();
			this.consume(TokenType.RIGHT_PAREN, "Expect ')' after expression.");
			return new Grouping(expr);
		}

		throw this.error(this.peek(), 'Expect expression');
	}

	// Panic Mode
	private consume(type: TokenType, message: string): Token {
		if (this.check(type)) return this.advance();

		throw this.error(this.peek(), message);
	}

	private error(token: Token, message: string): ParserError {
		Lox.parseError(token, message);
		return new ParserError();
	}

	private reportBinaryOperatorError(operatorType: TokenType) {
		const operatorToken = this.previous();
		Lox.parseError(
			operatorToken,
			`Binary operator '${operatorToken.lexeme}' appears without a left-hand operand.`
		);
	}

	private synchronize() {
		this.advance();

		while (!this.isAtEnd()) {
			if (this.previous().type === TokenType.SEMICOLON) return;

			switch (this.peek().type) {
				case TokenType.CLASS:
				case TokenType.FUN:
				case TokenType.LET:
				case TokenType.FOR:
				case TokenType.IF:
				case TokenType.WHILE:
				case TokenType.PRINT:
				case TokenType.RETURN:
					return;
			}

			this.advance();
		}
	}

	private match(types: TokenType[]): boolean {
		for (const type of types) {
			if (this.check(type)) {
				this.advance();
				return true;
			}
		}

		return false;
	}

	private check(type: TokenType): boolean {
		if (this.isAtEnd()) return false;
		return this.peek().type === type;
	}

	private advance(): Token {
		if (!this.isAtEnd()) this.current++;
		return this.previous();
	}

	private isAtEnd(): boolean {
		return this.peek().type === TokenType.EOF;
	}

	private peek(): Token {
		return this.tokens[this.current];
	}

	private previous(): Token {
		return this.tokens[this.current - 1];
	}
}

class ParserError extends Error {
	constructor(message?: string) {
		super(message);
		this.name = 'ParserError';
	}
}
