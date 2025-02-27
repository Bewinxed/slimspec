![slimspec banner waifu](banner.png)

```bash
  /$$$$$$  /$$ /$$                /$$$$$$                               
 /$$__  $$| $$|__/               /$$__  $$                              
| $$  \__/| $$ /$$ /$$$$$$/$$$$ | $$  \__/  /$$$$$$   /$$$$$$   /$$$$$$$
|  $$$$$$ | $$| $$| $$_  $$_  $$|  $$$$$$  /$$__  $$ /$$__  $$ /$$_____/
 \____  $$| $$| $$| $$ \ $$ \ $$ \____  $$| $$  \ $$| $$$$$$$$| $$      
 /$$  \ $$| $$| $$| $$ | $$ | $$ /$$  \ $$| $$  | $$| $$_____/| $$      
|  $$$$$$/| $$| $$| $$ | $$ | $$|  $$$$$$/| $$$$$$$/|  $$$$$$$|  $$$$$$$
 \______/ |__/|__/|__/ |__/ |__/ \______/ | $$____/  \_______/ \_______/
                                          | $$                          
                                          | $$                          
                                          |__/            
```                                                        
# SlimSpec : Towards Zero-Shot, API Spec Compression & Decompression
SlimSpec is a token-optimized format for representing API specifications with semantic precision. Designed for Zero-Shot LLM context window efficiency.

At the current iteration, It achieves 66% less tokens than traditional RAML.

## Evaluations

3 Tests were done based on 3 examples:
1 - Simple CRUD API
2 - Complex E-commerce API
3 - Nested and recursive structures

**Compression Test**
[compression](https://app.promptfoo.dev/eval/f:61513ea9-b9bf-4d98-8ad9-4fb83c3db224/)
All popular LLMs appear to be able to compress SlimSpec to a similar token count.

**Decompression Test**
[decompression](https://app.promptfoo.dev/eval/f:5291008f-7f31-4bd3-8b16-cd462bbcab43/)
Sonnet > Gemini > Gpt-4o > Deepseek.

Rubric was tested with Zero-Shot decompression with NO CONTEXT WHATSOEVER.

## Features

- 60-70% token reduction compared to standard API specifications
- Complete semantic preservation for lossless conversion
- Support for complex type systems, inheritance, and validation rules
- Preserves exact structure of request/response bodies
- Maintains precision for date/time types, formats, and constraints

## Installation
```bash
# Install globally
bun install -g slimspec

# Or run with bunx
bunx slimspec
```

## Usage

```bash
# Compress all files in current directory
slimspec c .

# Compress specific file
slimspec c ./api-spec.raml

# Compress with specific model
slimspec c . --model openai:gpt-4o

# Compress with custom prompt
slimspec c . --prompt ./custom-prompt.txt

# Compress to custom output directory
slimspec c . --output ./compressed-specs
```
```bash
# Decompress all .apaic files in current directory
slimspec d .

# Decompress specific file
slimspec d ./api-spec.apaic

# Decompress with specific model
slimspec d . --model openai:gpt-4o

# Decompress with custom prompt
slimspec d . --prompt ./custom-decompress-prompt.txt

# By default, fileps are saved in the same directory as the input file
# To save in a custom output directory:
slimspec d . --output ./decompressed-specs
```

## Syntax Reference

### Metadata
```
@meta{title:API Name,version:v1,baseUri:uri,mediaType:a/json}
```

### Type Definitions
```
T:TypeName{field1:s!,field2:i?,nested:{prop:s!}}
T:Child:Parent{additionalField:s!}
```

### Error Definitions
```
E:ErrorType{code:i!,message:s!,details:s?}
```

### Traits & Security
```
@trait:pagination{limit:i?=20,offset:i?=0}
@security:oauth2{tokenUri:s!,scopes:s[]}
```

### Endpoints
```
GET/resources|{@trait:pagination}|{200(a/json):*Resource[],404:*Error}
POST/resources|{field1:s!,field2:i?}@originalInline|{201:*Resource,400:{message:s!}}
PUT/resources/{id:s!}|{*Resource}|{200:*Resource,404}
PATCH/resources/{id}|{field1:s?}|{200:*Resource,404}
DELETE/resources/{id}||{204,404}
```

### Type System
- `s` - string
- `i` - integer
- `n` - number
- `b` - boolean
- `d(date)` - date-only
- `d(datetime)` - datetime
- `type[]` - array
- `e(val1|val2)` - enum
- `!` - required
- `?` - optional
- `?=default` - optional with default

### Formats & Constraints
- `s(uuid)` - UUID format
- `s(email)` - Email format
- `s(uri)` - URI format
- `s(3,100)` - Min/max length
- `i>=0` - Minimum value
- `s~regex` - Pattern matching

## Example

### RAML
```raml
types:
  User:
    properties:
      id: string
      email:
        type: string
        format: email
        required: true
      createdAt: datetime
/users:
  get:
    responses:
      200:
        body:
          application/json:
            type: array
            items: User
```

### SlimSpec
```
@meta{mediaType:application/json}
T:User{id:s?,email:s(email)!,createdAt:d(datetime)?}
GET/users||{200(a/json):*User[]}
```

## License

MIT