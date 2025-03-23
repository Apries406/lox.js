import { Lox } from './Lox';
import { Token } from './Token';
import { TokenType } from './TokenType';

export class Scanner {
	private readonly source: string;
	private readonly tokens: Array<Token> = [];
	private start: number = 0;
	private current: number = 0;
	private line: number = 1;

	private charTokenMap = {
		'(': TokenType.LEFT_PAREN,
		')': TokenType.RIGHT_PAREN,
		'{': TokenType.LEFT_BRACE,
		'}': TokenType.RIGHT_BRACE,
		',': TokenType.COMMA,
		'.': TokenType.DOT,
		';': TokenType.SEMICOLON,
		'-': TokenType.MINUS,
		'+': TokenType.PLUS,
		'*': TokenType.STAR,
	};

	static keywords = {
		and: TokenType.AND,
		class: TokenType.CLASS,
		else: TokenType.ELSE,
		false: TokenType.FALSE,
		for: TokenType.FOR,
		fun: TokenType.FUN,
		if: TokenType.IF,
		let: TokenType.LET,
		nil: TokenType.NIL,
		or: TokenType.OR,
		print: TokenType.PRINT,
		return: TokenType.RETURN,
		super: TokenType.SUPER,
		this: TokenType.THIS,
		true: TokenType.TRUE,
		while: TokenType.WHILE,
	};

	constructor(source: string) {
		this.source = source;
	}

	scanTokens(): Array<Token> {
		while (!this.isAtEnd()) {
			this.start = this.current;
			this.scanToken();
		}

		this.tokens.push(new Token(TokenType.EOF, '', null, this.line));
		return this.tokens;
	}

	isAtEnd(): boolean {
		return this.current >= this.source.length;
	}

	// 识别词素
	scanToken() {
		const c = this.advance();
		if (Object.keys(this.charTokenMap).includes(c)) {
			this.addToken(this.charTokenMap[c]);
		} else {
			switch (c) {
				case '!':
					this.addToken(
						this.match('=') ? TokenType.BANG_EQUAL : TokenType.BANG
					);
					break;
				case '=':
					this.addToken(
						this.match('=') ? TokenType.EQUAL_EQUAL : TokenType.EQUAL
					);
					break;
				case '<':
					this.addToken(
						this.match('=') ? TokenType.LESS_EQUAL : TokenType.LESS
					);
					break;
				case '>':
					this.addToken(
						this.match('=') ? TokenType.GREATER_EQUAL : TokenType.GREATER
					);
					break;
				case '/':
					if (this.match('/')) {
						// 单行注释
						while (this.peek() !== '\n' && !this.isAtEnd()) {
							this.advance();
						}
					} else if (this.match('*')) {
						// 块注释
						this.blockComment();
					} else {
						this.addToken(TokenType.SLASH);
					}
					break;
				case ' ':
				case '\r':
				case '\t':
					// Ignore whitespace.
					break;

				case '\n':
					this.line++;
					break;

				case '"':
					this.string();
					break;
				default:
					if (this.isDigit(c)) {
						this.number();
					} else if (this.isAlpha(c)) {
						this.identifier();
					} else {
						Lox.error(this.line, 'Unexpected character.');
					}
			}
		}
	}

	private peek(): string {
		if (this.isAtEnd()) return '\0';
		return this.source.charAt(this.current);
	}

	isDigit(c: string) {
		return c >= '0' && c <= '9';
	}

	match(expected: string) {
		if (this.isAtEnd()) return false;
		if (this.source.charAt(this.current) !== expected) return false;

		this.current++;
		return true;
	}

	advance(): string {
		return this.source.charAt(this.current++);
	}

	addToken(type: TokenType): void;
	addToken(type: TokenType, literal: any): void;
	addToken(type: TokenType, literal: any = null) {
		const text = this.source.substring(this.start, this.current);
		this.tokens.push(new Token(type, text, literal, this.line));
	}

	blockComment() {
		let commentDepth = 1; // 支持嵌套注释
		while (commentDepth > 0) {
			if (this.isAtEnd()) {
				Lox.error(this.line, 'Unterminated block comment');
				return;
			}

			if (this.peek() === '\n') {
				this.line++;
			}

			if (this.peek() === '/' && this.peekNext() === '*') {
				// 遇到嵌套的 /*
				commentDepth++;
				this.advance(); // 跳过 /
				this.advance(); // 跳过 *
			} else if (this.peek() === '*' && this.peekNext() === '/') {
				// 遇到 */
				commentDepth--;
				this.advance(); // 跳过 *
				this.advance(); // 跳过 /
			} else {
				this.advance();
			}
		}
	}

	string() {
		while (this.peek() !== '"' && !this.isAtEnd()) {
			if (this.peek() === '\n') this.line++;

			this.advance();
		}

		if (this.isAtEnd()) {
			Lox.error(this.line, 'Unterminated string');
			return;
		}

		this.advance(); // 跳过 '"'

		// 去除引号
		const value = this.source.substring(this.start + 1, this.current - 1);
		this.addToken(TokenType.STRING, value);
	}

	number() {
		while (this.isDigit(this.peek())) this.advance();

		if (this.peek() === '.' && this.isDigit(this.peekNext())) {
			this.advance();
			while (this.isDigit(this.peek())) this.advance();
		}

		const value = this.source.substring(this.start, this.current);
		this.addToken(TokenType.NUMBER, parseFloat(value));
	}

	identifier() {
		while (this.isAlphaNumeric(this.peek())) this.advance();

		const text = this.source.substring(this.start, this.current);
		let type: TokenType = Scanner.keywords[text];

		if (type === undefined) type = TokenType.IDENTIFIER;

		this.addToken(type);
	}

	isAlphaNumeric(c: string) {
		return this.isAlpha(c) || this.isDigit(c);
	}

	peekNext() {
		if (this.current + 1 >= this.source.length) {
			return '\0';
		}
		return this, this.source.charAt(this.current + 1);
	}

	isAlpha(c: string): boolean {
		return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c == '_';
	}
}
