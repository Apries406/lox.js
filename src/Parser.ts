import {
	Assign,
	Binary,
	Comma,
	Conditional,
	Expr,
	Grouping,
	Literal,
	Logical,
	Unary,
	Variable,
} from './Expr';
import { Lox } from './Lox';
import {
	Block,
	Break,
	Continue,
	Expression,
	If,
	Let,
	Print,
	Stmt,
	While,
} from './Stmt';
import { Token } from './Token';
import { TokenType } from './TokenType';

export class Parser {
	private readonly tokens: Token[];
	private current: number = 0;
	private inLoop = false;

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
			if (this.match([TokenType.CONTINUE])) return this.continueStatement();
			if (this.match([TokenType.BREAK])) return this.breakStatement();
			if (this.match([TokenType.LET])) return this.letDeclaration();

			return this.statements();
		} catch (error) {
			this.synchronize();
			return null as unknown as Stmt;
		}
	}

	private expression(): Expr {
		return this.comma();
	}

	private statements(): Stmt {
		if (this.match([TokenType.FOR])) return this.forStatement();
		if (this.match([TokenType.IF])) return this.IfStatement();
		if (this.match([TokenType.PRINT])) return this.printStatement();
		if (this.match([TokenType.WHILE])) return this.whileStatement();
		if (this.match([TokenType.LEFT_BRACE])) return new Block(this.block());
		return this.expressionStatement();
	}

	private forStatement() {
		this.inLoop = true;
		try {
			this.consume(TokenType.LEFT_PAREN, "Expected '(' after 'for'");

			const initializer = this.match([TokenType.SEMICOLON])
				? null
				: this.match([TokenType.LET])
				? this.letDeclaration()
				: this.expressionStatement();

			let condition = this.check(TokenType.SEMICOLON)
				? null
				: this.expression();

			this.consume(TokenType.SEMICOLON, "Expect ';' after loop condition");

			const increment = this.check(TokenType.RIGHT_PAREN)
				? null
				: this.expression();

			this.consume(TokenType.RIGHT_PAREN, "Expect ')' after for clauses");

			let body = increment
				? new Block([this.statements(), new Expression(increment)])
				: this.statements();

			if (!condition) condition = new Literal(true);
			body = new While(condition, body);

			if (initializer) body = new Block([initializer, body]);

			return body;
		} finally {
			this.inLoop = false;
		}
	}

	private IfStatement(): Stmt {
		this.consume(TokenType.LEFT_PAREN, "Expect '(' after 'if'. ");
		const condition: Expr = this.expression();
		this.consume(TokenType.RIGHT_PAREN, "Expected ')'");

		const thenBranch: Stmt = this.statements();
		const elseBranch: Stmt | null = this.match([TokenType.ELSE])
			? this.statements()
			: null;

		return new If(condition, thenBranch, elseBranch as Stmt);
	}

	private printStatement(): Stmt {
		const value: Expr = this.expression();
		this.consume(TokenType.SEMICOLON, "Expect ';' after value.");
		return new Print(value);
	}

	private whileStatement(): Stmt {
		this.inLoop = true;
		try {
			this.consume(TokenType.LEFT_PAREN, "Expect '(' after 'while'.");
			const condition: Expr = this.expression();
			this.consume(TokenType.RIGHT_PAREN, "Expect ')' after condition.");
			const body = this.statements();
			return new While(condition, body);
		} finally {
			this.inLoop = false;
		}
	}

	private continueStatement(): Stmt {
		const keyword = this.previous();
		this.consume(TokenType.SEMICOLON, "Expect ';' after 'continue'.");
		if (!this.inLoop) {
			this.error(keyword, "Can't use 'continue' outsize of a loop.");
		}
		return new Continue(keyword);
	}

	private breakStatement(): Stmt {
		const keyword = this.previous();
		this.consume(TokenType.SEMICOLON, "Expect ';' after 'break'.");
		if (!this.inLoop) {
			this.error(keyword, "Can't use 'break' outsize of a loop.");
		}

		return new Break(keyword);
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
		const expr = this.conditional();
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

	private or(): Expr {
		let expr = this.and();
		while (this.match([TokenType.OR])) {
			const operator = this.previous();
			const right = this.and();
			expr = new Logical(expr, operator, right);
		}
		return expr;
	}

	private and(): Expr {
		let expr = this.equality();
		while (this.match([TokenType.AND])) {
			const operator = this.previous();
			const right = this.equality();
			expr = new Logical(expr, operator, right);
		}

		return expr;
	}

	// comma -> conditional(",", conditional)*
	private comma(): Expr {
		let expr = this.assignment();

		while (this.match([TokenType.COMMA])) {
			if (expr === null) {
				this.reportBinaryOperatorError(TokenType.COMMA);
				this.assignment(); // 解析并丢弃右操作数
			} else {
				const operator = this.previous();
				const right = this.assignment();
				expr = new Comma(expr, operator, right);
			}
		}

		return expr;
	}

	// conditional -> equality ("?" expression ":" conditional)?
	private conditional(): Expr {
		let expr = this.or();

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

		if (this.match([TokenType.NIL])) return new Literal(null);

		if (this.match([TokenType.NUMBER, TokenType.STRING]))
			return new Literal(this.previous().literal);

		if (this.match([TokenType.IDENTIFIER]))
			return new Variable(this.previous());

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
