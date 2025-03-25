import {
	Assign,
	Binary,
	Comma,
	Conditional,
	Expr,
	Grouping,
	Literal,
	Unary,
	Variable,
} from './Expr';
import { Lox } from './Lox';
import { Block, Expression, Let, Print, Stmt } from './Stmt';
import { Token } from './Token';
import { TokenType } from './TokenType';

export class Parser {
	private readonly tokens: Token[];
	private current: number = 0;

	constructor(tokens: Token[]) {
		this.tokens = tokens;
	}

	parse(): Array<Stmt> {
		const statements: Array<Stmt> = [];
		while (!this.isAtEnd()) {
			statements.push(this.declaration());
		}

		return statements;
	}
	private declaration(): Stmt {
		try {
			if (this.match([TokenType.LET])) return this.letDeclaration();

			return this.statements();
		} catch (error) {
			this.synchronize();
			return null as unknown as Stmt;
		}
	}

	private expression(): Expr {
		return this.assignment();
	}

	private statements(): Stmt {
		if (this.match([TokenType.PRINT])) return this.printStatement();
		if (this.match([TokenType.LEFT_BRACE])) return new Block(this.block());
		return this.expressionStatement();
	}

	private printStatement(): Stmt {
		const value: Expr = this.expression();
		this.consume(TokenType.SEMICOLON, "Expect ';' after value.");
		return new Print(value);
	}

	private letDeclaration(): Stmt {
		const name: Token = this.consume(
			TokenType.IDENTIFIER,
			'Expect variable name.'
		);

		let initializer: Expr = null as unknown as Expr;
		if (this.match([TokenType.EQUAL])) {
			initializer = this.expression();
		}

		this.consume(TokenType.SEMICOLON, "Expect ';' after variable declaration.");
		return new Let(name, initializer);
	}

	private expressionStatement(): Stmt {
		const value: Expr = this.expression();
		this.consume(TokenType.SEMICOLON, "Expected ';' after expression.");
		return new Expression(value);
	}

	private block(): Array<Stmt> {
		const statements: Array<Stmt> = [];

		while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
			statements.push(this.declaration());
		}

		this.consume(TokenType.RIGHT_BRACE, "Expect '}' after block.");
		return statements;
	}

	// expression -> assignment
	// assignment -> IDENTIFIER "=" assignment | equality;
	private assignment(): Expr {
		const expr = this.equality();

		if (this.match([TokenType.EQUAL])) {
			const equals = this.previous();
			const value = this.assignment();

			if (expr instanceof Variable) {
				const name = expr.name;

				return new Assign(name, value);
			}

			this.error(equals, 'Invalid assignment target.');
		}

		return expr;
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
		let expr: Expr = this.comparison();

		while (this.match([TokenType.BANG_EQUAL, TokenType.EQUAL_EQUAL])) {
			if (expr === null) {
				this.reportBinaryOperatorError(this.previous().type); // 有两个，不确定
				this.comparison(); // 解析并丢弃右操作数
			} else {
				const operator = this.previous();
				const right = this.comparison();
				expr = new Binary(expr, operator, right);
			}
		}

		return expr;
	}

	// comparison -> term((">" | ">=" | "<"| "<=")term)*
	private comparison(): Expr {
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
		if (this.match([TokenType.FALSE])) return new Literal(false);
		if (this.match([TokenType.TRUE])) return new Literal(true);
		if (this.match[TokenType.NIL]) return new Literal(null);

		if (this.match([TokenType.NUMBER, TokenType.STRING])) {
			return new Literal(this.previous().literal);
		}

		if (this.match([TokenType.IDENTIFIER])) {
			return new Variable(this.previous());
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
