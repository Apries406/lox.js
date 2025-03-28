import { Expr } from './Expr';
import { Lox } from './Lox';
import { Stmt } from './Stmt';
import { Token } from './Token';
import { TokenType } from './TokenType';

export class Parser {
	private readonly tokens: Token[];
	private current: number = 0;
	private inLoop = false;

	constructor(tokens: Token[]) {
		this.tokens = tokens;
	}

	parse(): Array<Stmt.Stmt> {
		const statements: Array<Stmt.Stmt> = [];
		while (!this.isAtEnd()) {
			statements.push(this.declaration());
		}

		return statements;
	}
	// declaration -> funcDecl | letDecl | statement
	// funcDecl -> "fun" function
	// function -> IDENTIFIER "(" parameters ")" block;
	private declaration(): Stmt.Stmt {
		try {
			if (this.match([TokenType.FUN])) return this.function('function');
			if (this.match([TokenType.CONTINUE])) return this.continueStatement();
			if (this.match([TokenType.BREAK])) return this.breakStatement();
			if (this.match([TokenType.LET])) return this.letDeclaration();

			return this.statements();
		} catch (error) {
			this.synchronize();
			return null as unknown as Stmt.Stmt;
		}
	}

	anonymousFunction(): Expr.Expr {
		this.consume(TokenType.LEFT_PAREN, "Expect '(' after 'fun' keyword.");
		const parameters: Array<Token> = [];

		if (!this.check(TokenType.RIGHT_PAREN)) {
			do {
				if (parameters.length >= 255) {
					this.error(this.peek(), "Can't have more than 255 parameters.");
				}

				parameters.push(
					this.consume(TokenType.IDENTIFIER, 'Expect parameter name.')
				);
			} while (this.match([TokenType.COMMA]));
		}

		this.consume(TokenType.RIGHT_PAREN, "Expect ')' after parameters.");
		this.consume(
			TokenType.LEFT_BRACE,
			"Expected '{' before anonymous function body."
		);

		const body: Array<Stmt.Stmt> = this.block();

		return new Expr.AnonymousFunction(parameters, body);
	}

	private expression(): Expr.Expr {
		return this.assignment();
	}

	private statements(): Stmt.Stmt {
		if (this.match([TokenType.FOR])) return this.forStatement();
		if (this.match([TokenType.IF])) return this.IfStatement();
		if (this.match([TokenType.PRINT])) return this.printStatement();
		if (this.match([TokenType.RETURN])) return this.returnStatement();
		if (this.match([TokenType.WHILE])) return this.whileStatement();
		if (this.match([TokenType.LEFT_BRACE])) return new Stmt.Block(this.block());
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

			let condition = this.check(TokenType.SEMICOLON) ? null : this.comma();

			this.consume(TokenType.SEMICOLON, "Expect ';' after loop condition");

			const increment = this.check(TokenType.RIGHT_PAREN) ? null : this.comma();

			this.consume(TokenType.RIGHT_PAREN, "Expect ')' after for clauses");

			let body = increment
				? new Stmt.Block([this.statements(), new Stmt.Expression(increment)])
				: this.statements();

			if (!condition) condition = new Expr.Literal(true);
			body = new Stmt.While(condition, body);

			if (initializer) body = new Stmt.Block([initializer, body]);

			return body;
		} finally {
			this.inLoop = false;
		}
	}

	private IfStatement(): Stmt.Stmt {
		this.consume(TokenType.LEFT_PAREN, "Expect '(' after 'if'. ");
		const condition: Expr.Expr = this.comma();
		this.consume(TokenType.RIGHT_PAREN, "Expected ')'");

		const thenBranch: Stmt.Stmt = this.statements();
		const elseBranch: Stmt.Stmt | null = this.match([TokenType.ELSE])
			? this.statements()
			: null;

		return new Stmt.If(condition, thenBranch, elseBranch as Stmt.Stmt);
	}

	private printStatement(): Stmt.Stmt {
		const value: Expr.Expr = this.comma();
		this.consume(TokenType.SEMICOLON, "Expect ';' after value.");
		return new Stmt.Print(value);
	}

	private returnStatement(): Stmt.Stmt {
		const keyword = this.previous();
		const value = this.check(TokenType.SEMICOLON)
			? (null as unknown as Expr.Expr)
			: this.comma();

		this.consume(TokenType.SEMICOLON, "Expect ';' after return value.");

		return new Stmt.Return(keyword, value);
	}

	private whileStatement(): Stmt.Stmt {
		this.inLoop = true;
		try {
			this.consume(TokenType.LEFT_PAREN, "Expect '(' after 'while'.");
			const condition: Expr.Expr = this.comma();
			this.consume(TokenType.RIGHT_PAREN, "Expect ')' after condition.");
			const body = this.statements();
			return new Stmt.While(condition, body);
		} finally {
			this.inLoop = false;
		}
	}

	private continueStatement(): Stmt.Stmt {
		const keyword = this.previous();
		this.consume(TokenType.SEMICOLON, "Expect ';' after 'continue'.");
		if (!this.inLoop) {
			this.error(keyword, "Can't use 'continue' outsize of a loop.");
		}
		return new Stmt.Continue(keyword);
	}

	private breakStatement(): Stmt.Stmt {
		const keyword = this.previous();
		this.consume(TokenType.SEMICOLON, "Expect ';' after 'break'.");
		if (!this.inLoop) {
			this.error(keyword, "Can't use 'break' outsize of a loop.");
		}

		return new Stmt.Break(keyword);
	}

	private letDeclaration(): Stmt.Stmt {
		const name: Token = this.consume(
			TokenType.IDENTIFIER,
			'Expect variable name.'
		);

		let initializer: Expr.Expr = null as unknown as Expr.Expr;
		if (this.match([TokenType.EQUAL])) {
			initializer = this.comma();
		}

		this.consume(TokenType.SEMICOLON, "Expect ';' after variable declaration.");
		return new Stmt.Let(name, initializer);
	}

	private expressionStatement(): Stmt.Stmt {
		const value: Expr.Expr = this.comma();
		this.consume(TokenType.SEMICOLON, "Expected ';' after expression.");
		return new Stmt.Expression(value);
	}

	private function(kind: string) {
		const name = this.consume(TokenType.IDENTIFIER, `Expect ${kind} name.`);

		this.consume(TokenType.LEFT_PAREN, `Expect '(' after ${kind} name.`);
		const parameters: Array<Token> = [];
		if (!this.check(TokenType.RIGHT_PAREN)) {
			do {
				if (parameters.length >= 255) {
					this.error(this.peek(), "Can't have more than 255 parameters.");
				}

				parameters.push(
					this.consume(TokenType.IDENTIFIER, 'Expect parameter name.')
				);
			} while (this.match([TokenType.COMMA]));
		}

		this.consume(TokenType.RIGHT_PAREN, "Expect ')' after parameters.");
		this.consume(TokenType.LEFT_BRACE, `Expect '{' before ${kind} body.`);
		const body: Array<Stmt.Stmt> = this.block();

		return new Stmt.Function(name, parameters, body);
	}

	private block(): Array<Stmt.Stmt> {
		const statements: Array<Stmt.Stmt> = [];

		while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
			statements.push(this.declaration());
		}

		this.consume(TokenType.RIGHT_BRACE, "Expect '}' after block.");
		return statements;
	}

	// expression -> assignment
	// assignment -> IDENTIFIER "=" assignment | equality;
	private assignment(): Expr.Expr {
		const expr = this.or();
		if (this.match([TokenType.EQUAL])) {
			const equals = this.previous();
			const value = this.assignment();

			if (expr instanceof Expr.Variable) {
				const name = expr.name;

				return new Expr.Assign(name, value);
			}

			this.error(equals, 'Invalid assignment target.');
		}

		return expr;
	}

	private or(): Expr.Expr {
		let expr = this.and();
		while (this.match([TokenType.OR])) {
			const operator = this.previous();
			const right = this.and();
			expr = new Expr.Logical(expr, operator, right);
		}
		return this.conditional(expr);
	}

	private and(): Expr.Expr {
		let expr = this.equality();
		while (this.match([TokenType.AND])) {
			const operator = this.previous();
			const right = this.equality();
			expr = new Expr.Logical(expr, operator, right);
		}

		return expr;
	}

	// equality -> comparison(("!=" | "==")comparison)*
	private equality(): Expr.Expr {
		let expr: Expr.Expr = this.comparison();

		while (this.match([TokenType.BANG_EQUAL, TokenType.EQUAL_EQUAL])) {
			if (expr === null) {
				this.reportBinaryOperatorError(this.previous().type); // 有两个，不确定
				this.comparison(); // 解析并丢弃右操作数
			} else {
				const operator = this.previous();
				const right = this.comparison();
				expr = new Expr.Binary(expr, operator, right);
			}
		}

		return expr;
	}

	// comparison -> term((">" | ">=" | "<"| "<=")term)*
	private comparison(): Expr.Expr {
		let expr: Expr.Expr = this.term();

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
				expr = new Expr.Binary(expr, operator, right);
			}
		}

		return expr;
	}

	// term -> factor(("-" | "+")factor)*
	private term(): Expr.Expr {
		let expr = this.factor();

		while (this.match([TokenType.MINUS, TokenType.PLUS])) {
			if (expr === null) {
				this.reportBinaryOperatorError(this.previous().type);
				this.factor(); // 解析并丢弃右操作数
			} else {
				const operator = this.previous();
				const right = this.factor();
				expr = new Expr.Binary(expr, operator, right);
			}
		}

		return expr;
	}

	// factor => unary(("/" | "*")unary)*
	private factor(): Expr.Expr {
		let expr = this.unary();

		while (this.match([TokenType.SLASH, TokenType.STAR])) {
			if (expr === null) {
				this.reportBinaryOperatorError(this.previous().type);
				this.unary(); // 解析并丢弃右操作数
			} else {
				const operator = this.previous();
				const right = this.factor();
				expr = new Expr.Binary(expr, operator, right);
			}
		}
		return expr;
	}

	// unary -> ("!" | "-")unary | call
	private unary(): Expr.Expr {
		if (this.match([TokenType.BANG, TokenType.MINUS])) {
			const operator = this.previous();
			const right = this.unary();
			const expr = new Expr.Unary(operator, right);

			return expr;
		}
		return this.call();
	}

	// comma -> conditional(",", conditional)*
	private comma(): Expr.Expr {
		let expr = this.expression();

		while (this.match([TokenType.COMMA])) {
			if (expr === null) {
				this.reportBinaryOperatorError(TokenType.COMMA);
				this.expression(); // 解析并丢弃右操作数
			} else {
				const operator = this.previous();
				const right = this.expression();
				expr = new Expr.Comma(expr, operator, right);
			}
		}

		return expr;
	}

	// conditional -> equality ("?" expression ":" conditional)?
	private conditional(initializer?: Expr.Expr): Expr.Expr {
		let expr = initializer || this.or();

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
				expr = new Expr.Conditional(expr as Expr.Expr, thenBranch, elseBranch);
			}
		}

		return expr;
	}

	private finishCall(callee: Expr.Expr): Expr.Expr {
		const argumentArray: Array<Expr.Expr> = [];

		if (!this.check(TokenType.RIGHT_PAREN)) {
			do {
				if (argumentArray.length >= 255) {
					this.error(this.peek(), "Can't have more than 255 arguments.");
				}
				argumentArray.push(this.expression());
			} while (this.match([TokenType.COMMA]));
		}

		const paren = this.consume(
			TokenType.RIGHT_PAREN,
			"Expect ')' after arguments."
		);

		return new Expr.Call(callee, paren, argumentArray);
	}

	// call -> primary | primary("(" arguments? ")")*;
	private call(): Expr.Expr {
		let expr = this.primary();

		while (true) {
			if (this.match([TokenType.LEFT_PAREN])) {
				expr = this.finishCall(expr);
			} else {
				break;
			}
		}

		return expr;
	}

	// arguments -> expression("," expression)*
	private arguments() {}

	// primary -> NUMBER | STRING | "true" | "false" | "nil" | "(" expr ")";
	private primary(): Expr.Expr {
		if (this.match([TokenType.FALSE])) return new Expr.Literal(false);

		if (this.match([TokenType.TRUE])) return new Expr.Literal(true);

		if (this.match([TokenType.NIL])) return new Expr.Literal(null);

		if (this.match([TokenType.FUN])) {
			return this.anonymousFunction();
		}

		if (this.match([TokenType.NUMBER, TokenType.STRING]))
			return new Expr.Literal(this.previous().literal);

		if (this.match([TokenType.IDENTIFIER]))
			return new Expr.Variable(this.previous());

		if (this.match([TokenType.LEFT_PAREN])) {
			const expr = this.expression();
			this.consume(TokenType.RIGHT_PAREN, "Expect ')' after expression.");
			return new Expr.Grouping(expr);
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
