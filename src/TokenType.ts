export enum TokenType {
	// 单字符符号 tokens
	LEFT_PAREN, // (
	RIGHT_PAREN, // )
	LEFT_BRACE, // {
	RIGHT_BRACE, // }
	COMMA, // ,
	DOT, // .
	MINUS, // -
	PLUS, // +
	SEMICOLON, // ;
	SLASH, // /
	STAR, // *

	// 单/多字符符号 tokens
	BANG, // !
	BANG_EQUAL, // !=
	EQUAL, // =
	EQUAL_EQUAL, // ==
	GREATER, // >
	GREATER_EQUAL, // >=
	LESS, // <
	LESS_EQUAL, // <=

	// 字面量
	IDENTIFIER, // 标识符 (变量名、函数名、类名）
	STRING, // 字符串
	NUMBER, // 双精度浮点数

	// Keywords,
	AND,
	CLASS,
	ELSE,
	FALSE,
	FUN,
	FOR,
	IF,
	LET, // 改造成 let 声明
	NIL,
	OR,
	PRINT,
	RETURN,
	SUPER,
	THIS,
	TRUE,
	WHILE,

	EOF,
}
