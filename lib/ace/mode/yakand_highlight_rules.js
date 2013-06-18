/* ***** BEGIN LICENSE BLOCK *****
 * Distributed under the BSD license:
 *
 * Copyright (c) 2010, Ajax.org B.V.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *     * Redistributions of source code must retain the above copyright
 *       notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above copyright
 *       notice, this list of conditions and the following disclaimer in the
 *       documentation and/or other materials provided with the distribution.
 *     * Neither the name of Ajax.org B.V. nor the
 *       names of its contributors may be used to endorse or promote products
 *       derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL AJAX.ORG B.V. BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * ***** END LICENSE BLOCK ***** */

define(function(require, exports, module) {
"use strict";

var oop = require("../lib/oop");
var TextHighlightRules = require("./text_highlight_rules").TextHighlightRules;

// exports is for Haml
var constantOtherSymbol = exports.constantOtherSymbol = {
    token : "constant.other.symbol.ruby", // symbol
    regex : "[:](?:[A-Za-z_]|[@$](?=[a-zA-Z0-9_]))[a-zA-Z0-9_]*[!=?]?"
};

var qString = exports.qString = {
    token : "string", // single line
    regex : "['](?:(?:\\\\.)|(?:[^'\\\\]))*?[']"
};

var qqString = exports.qqString = {
    token : "string", // single line
    regex : '["](?:(?:\\\\.)|(?:[^"\\\\]))*?["]'
};

var tString = exports.tString = {
    token : "string", // backtick string
    regex : "[`](?:(?:\\\\.)|(?:[^'\\\\]))*?[`]"
};

var constantNumericHex = exports.constantNumericHex = {
    token : "constant.numeric", // hex
    regex : "0[xX][0-9a-fA-F](?:[0-9a-fA-F]|_(?=[0-9a-fA-F]))*\\b"
};

var constantNumericFloat = exports.constantNumericFloat = {
    token : "constant.numeric", // float
    regex : "[+-]?\\d(?:\\d|_(?=\\d))*(?:(?:\\.\\d(?:\\d|_(?=\\d))*)?(?:[eE][+-]?\\d+)?)?\\b"
};

var YakandHighlightRules = function() {

    var builtinFunctions = (
            "Array|Boolean|Date|Function|Iterator|Number|Object|RegExp|String|Proxy|"  + // Constructors 
            "Namespace|QName|XML|XMLList|"                                             + // E4X
            "ArrayBuffer|Float32Array|Float64Array|Int16Array|Int32Array|Int8Array|"   +
            "Uint16Array|Uint32Array|Uint8Array|Uint8ClampedArray|"                    +
            "Error|EvalError|InternalError|RangeError|ReferenceError|StopIteration|"   + // Errors
            "SyntaxError|TypeError|URIError|"                                          +
            "decodeURI|decodeURIComponent|encodeURI|encodeURIComponent|eval|isFinite|" + // Non-constructor functions
            "isNaN|parseFloat|parseInt|"                                               +
            "JSON|Math"                                                                // Other
    );

    var keywords = (
            "def|Yλ|λ|recfun|fun|elseif|let|endif|enddef|endλ|endfun|endrecfun|endselect|select" +
            "|method|dispatch|enddispatch|match|endmatch|" +
            "case|else|if|in|instanceof|typeof|let|with|begin|end|" +
            // invalid or reserved
            "__parent__|__count__|escape|unescape|with|__proto__"

        );

    var buildinConstants = (
        "true|false|null|Infinity|NaN|undefined"
    );

    var builtinVariables = (
         "this|arguments|prototype|window|document"                                  // Pseudo
    );

    var keywordMapper = this.$keywords = this.createKeywordMapper({
        "keyword": keywords,
        "constant.language": buildinConstants,
        "variable.language": builtinVariables,
        "support.function": builtinFunctions,
        "invalid.deprecated": "debugger" // TODO is this a remnant from js mode?
    }, "identifier");

    // regexp must not have capturing parentheses. Use (?:) instead.
    // regexps are ordered -> the first match is used

    this.$rules = {
        "start" : [
            {
                token : "comment",
                regex : "#.*$"
            }, {
                token : "comment", // multi line comment
                regex : "^=begin(?:$|\\s.*$)",
                next : "comment"
            }, {
                token : "string.regexp",
                regex : "[/](?:(?:\\[(?:\\\\]|[^\\]])+\\])|(?:\\\\/|[^\\]/]))*[/]\\w*\\s*(?=[).,;]|$)"
            },

            qString,
            qqString,
            tString,

            {
                token : "text", // namespaces aren't symbols
                regex : "::"
            }, {
                token : "variable.instance", // instance variable
                regex : "@{1,2}[a-zA-Z_\\d]+"
            }, {
                token : "support.class", // class name
                regex : "[A-Z][a-zA-Z_\\d]+"
            },

            constantOtherSymbol,
            constantNumericHex,
            constantNumericFloat,

            {
                token : "constant.language.boolean",
                regex : "(?:true|false)\\b"
            }, {
                token : keywordMapper,
                // TODO: Unicode escape sequences
                // TODO: Unicode identifiers
                regex : "[a-zA-Z_$][a-zA-Z0-9_$]*\\b"
            }, {
                token : "punctuation.separator.key-value",
                regex : "=>"
            }, {
                stateName: "heredoc",
                onMatch : function(value, currentState, stack) {
                    var next = value[2] == '-' ? "indentedHeredoc" : "heredoc";
                    var tokens = value.split(this.splitRegex);
                    stack.push(next, tokens[3]);
                    return [
                        {type:"constant", value: tokens[1]},
                        {type:"string", value: tokens[2]},
                        {type:"support.class", value: tokens[3]},
                        {type:"string", value: tokens[4]}
                    ];
                },
                regex : "(<<-?)(['\"`]?)([\\w]+)(['\"`]?)",
                rules: {
                    heredoc: [{
                        onMatch:  function(value, currentState, stack) {
                            if (value == stack[1]) {
                                stack.shift();
                                stack.shift();
                                return "support.class";
                            }
                            return "string";
                        },
                        regex: ".*$",
                        next: "start"
                    }],
                    indentedHeredoc: [{
                        token: "string",
                        regex: "^ +"
                    }, {
                        onMatch:  function(value, currentState, stack) {
                            if (value == stack[1]) {
                                stack.shift();
                                stack.shift();
                                return "support.class";
                            }
                            return "string";
                        },
                        regex: ".*$",
                        next: "start"
                    }]
                }
            }, {
                token : "keyword.operator",
                regex : "!|\\$|%|&|\\*|\\-\\-|\\-|\\+\\+|\\+|~|===|==|=|!=|!==|<=|>=|<<=|>>=|>>>=|<>|<|>|!|&&|\\|\\||\\?\\:|\\*=|%=|\\+=|\\-=|&=|\\^=|\\b(?:in|instanceof|new|delete|typeof|void)|[×÷↦⊻∨∧∩∪·¬≤≥≈≠≅·²³∘∈∉±]"
            }, {
                token : "paren.lparen",
                regex : "[[({]"
            }, {
                token : "paren.rparen",
                regex : "[\\])}]"
            }, {
                token : "text",
                regex : "\\s+"
            }
        ],
        "comment" : [
            {
                token : "comment", // closing comment
                regex : "^=end(?:$|\\s.*$)",
                next : "start"
            }, {
                token : "comment", // comment spanning whole line
                regex : ".+"
            }
        ]
    };

    this.normalizeRules();
};

oop.inherits(YakandHighlightRules, TextHighlightRules);

exports.YakandHighlightRules = YakandHighlightRules;
});
