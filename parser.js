/** Textile parser **/
Textile.Parser = Textile.Utils.makeClass({
   
   constructor: function(model, from, to) {
       this.model = model;
       this.from = from || 1;
       this.to = to || model.lines.length;
       if(!/^$/.test(this.model.lines[this.from-1].content)) {
           while(this.from > 1) {
               if(!/^$/.test(this.model.lines[this.from-1].content)) {
                   this.from--;
               } else {
                   this.from++;
                   break;
               }
           }
       }
       this.text = '';
       for(var i=this.from; i<=this.to; i++) {
           if(i>this.model.lines.length) {
               continue;
           }
           this.text += this.model.lines[i-1].content
           if(this.model.lines[i] && this.model.lines[i].line > this.model.lines[i-1].line) {
               this.text += '\n';
           } else {
               this.text += '\r';
           }                       
       }
       this.len = this.text.length;
       this.end = this.begin = 0;
       this.state = 'PLAIN';
       this.args = {};
   },
   
   found: function(newState, skip, tag) {
       var begin2 = this.begin;
       var end2 = --this.end + skip;
       this.lastState = this.state;
       var text = this.text.substring(begin2, end2);
       var lines = text.match(/[\n\r]/g);
       var from = this.from;
       var to = this.from + (lines ? lines.length - 1: 0);
       this.from = this.from + (lines ? lines.length: 0);
       this.begin = this.end += skip;
       this.state = newState;
       return {
           type: this.lastState,
           text: text,
           startLine: from,
           endLine: to,
           tag: tag
       };
   },
   
   checkHas: function(pattern, skip, noThis) {
       var nc = this.end + (skip ? skip : 0);
       while(nc < this.text.length && this.text.charAt(nc) != '\n') {
           var e = '';
           for(var i=0; i<pattern.length; i++) {
               e += this.text.charAt(nc+i);
           }
           if(e == pattern) {
               return true;
           }
           if(noThis && e.charAt(0).match(noThis)) {
               return false;
           }                       
           nc++;
       }
       return false;
   },
   
   markLine: function(tag) {
       return '<div id="line'+(this.from == 1 ? 1 : this.from+1)+'">' + tag;
   },
   
   nextToken: function() {     
       for(;;) {
           var left = this.len - this.end;
           if (left < 1 || !left) {
               this.end++;
               return this.found('EOF', 0);
           }

           var c = this.text.charAt(this.end++);
           var c1 = left > 1 ? this.text.charAt(this.end) : 0;
           var c2 = left > 2 ? this.text.charAt(this.end + 1) : 0;
           var c3 = left > 3 ? this.text.charAt(this.end + 2) : 0;

           /** The STATE machine **/
           if(this.state == 'PLAIN') {
                if(c == 'h' && /[1-6]/.test(c1) && c2 == '.') {
                    this.nextBlock = 'HEADING';
                    this.args.headingLevel = c1;
                    return this.found('BLOCK_START', 0, this.markLine('<h' + c1+'>'));
                }
                if(c == 'h' && /[1-6]/.test(c1) && c2 == '(' && this.checkHas(').', 3, ' ')) {
                    this.nextBlock = 'HEADING';
                    this.args.headingLevel = c1;
                    return this.found('BLOCK_START', 0, this.markLine('<h' + c1 + ' '));
                }
                if(c == 'p' && c1 == '.') {
                    this.nextBlock = 'PARAGRAPH';
                    return this.found('BLOCK_START', 0, this.markLine('<p>'));
                }
                if(c == 'p' && c1 == '(' && this.checkHas(').', 2, ' ')) {
                    this.nextBlock = 'PARAGRAPH';
                    return this.found('BLOCK_START', 0, this.markLine('<p '));
                }                            
                if(c == 'b' && c1 == 'q' && c2 == '.') {
                    this.nextBlock = 'BLOCKQUOTE';
                    return this.found('BLOCK_START', 0, this.markLine('<blockquote>'));
                }
                if(c == 'b' && c1 == 'q' && c2 == '(' && this.checkHas(').', 2, ' ')) {
                    this.nextBlock = 'BLOCKQUOTE';
                    return this.found('BLOCK_START', 0, this.markLine('<blockquote '));
                }
                if(c == 'b' && c1 == 'c' && c2 == '.') {
                    this.nextBlock = 'CODE';
                    return this.found('BLOCK_START', 0, this.markLine('<pre><code>'));
                }
                if(c == 'b' && c1 == 'c' && c2 == '(' && this.checkHas(').', 2, ' ')) {
                    this.nextBlock = 'CODE';
                    return this.found('BLOCK_START', 0, this.markLine('<pre><code '));
                }
                if(c == '*' && c1 == ' ') {
                    this.args.list = ['ul'];
                    return this.found('ITEM_START', 0, this.markLine('<ul><li>'));
                }
                if(c == '#' && c1 == ' ') {
                    this.args.list = ['ol'];
                    return this.found('ITEM_START', 0, this.markLine('<ol><li>'));
                }
                if(c != '\n') {
                    return this.found('PARAGRAPH', 0, this.markLine('<p>'));
                }
           }
           if(this.state == 'BLOCK_START') {
                if(c == '.') {
                    return this.found(this.nextBlock, 1);
                }
                if(c == '(' && this.checkHas(').', 1)) {
                    return this.found('BLOCK_STYLE', 0);
                }
           }
           if(this.state == 'BLOCK_STYLE') {
               if(c == ')' && c1 == '.') {
                   return this.found('BLOCK_START', 1);
               }
           }
           if(this.state == 'ITEM') {
               if(c == '\n' && c1 == '*' && c2 == ' ') {
                   if(this.args.list.length == 2) {
                       return this.found('ITEM_START', 0, '</li></' + this.args.list.pop() + '/><li>');
                   }
                   return this.found('ITEM_START', 0, '</li><li>');
               }
               if(c == '\n' && c1 == '*' && c2 == '*' && c3 == ' ') {
                   if(this.args.list.length == 1) {
                       this.args.list.push('ul');
                       return this.found('ITEM_START', 0, '</li><ul><li>');
                   }
                   if(this.args.list.length == 3) {
                       return this.found('ITEM_START', 0, '</li></' + this.args.list.pop() + '/><li>');
                   }
                   return this.found('ITEM_START', 0, '</li><li>');
               }
               if(c == '\n' && c1 == '*' && c2 == '*' && c3 == '*') {
                   if(this.args.list.length == 2) {
                       this.args.list.push('ul');
                       return this.found('ITEM_START', 0, '</li><ul><li>');
                   }
                   return this.found('ITEM_START', 0, '</li><li>');
               }
               if(c == '\n' && c1 == '#' && c2 == ' ') {
                   if(this.args.list.length == 2) {
                       return this.found('ITEM_START', 0, '</li></' + this.args.list.pop() + '/><li>');
                   }
                   return this.found('ITEM_START', 0, '</li><li>');
               }
               if(c == '\n' && c1 == '#' && c2 == '#' && c3 == ' ') {
                   if(this.args.list.length == 1) {
                       this.args.list.push('ol');
                       return this.found('ITEM_START', 0, '</li><ol><li>');
                   }
                   if(this.args.list.length == 3) {
                       return this.found('ITEM_START', 0, '</li></' + this.args.list.pop() + '/><li>');
                   }
                   return this.found('ITEM_START', 0, '</li><li>');
               }
               if(c == '\n' && c1 == '#' && c2 == '#' && c3 == '#') {
                   if(this.args.list.length == 2) {
                       this.args.list.push('ol');
                       return this.found('ITEM_START', 0, '</li><ol><li>');
                   }
                   return this.found('ITEM_START', 0, '</li><li>');
               }
           }
           if(this.state == 'ITEM_START') {
               if(c == ' ') {
                   return this.found('ITEM', 1);
               }
           }
           if(this.state == 'PARAGRAPH' || this.state == 'HEADING' || this.state == 'BLOCKQUOTE' || this.state == 'ITEM') {
                if(c == '*' && c1 == '*' && this.checkHas('**', 2)) {
                    return this.found('STRONG', 0, '<strong>');
                }
                if(c == '_' && c1 == '_' && this.checkHas('__', 2)) {
                    return this.found('EM', 0, '<em>');
                }
                if(c == '=' && c1 == '=' && c2 == '=' && c3 == '=') {
                    return this.found('NEWPAGE', 0);
                }
                if(c == '-' && c1 == '-') {
                    return this.found('DASH', 0);
                }
                if(c == ' ' && c1 == '-' && c2 == ' ') {
                    return this.found('HYPHEN', 0);
                }
                if(c == ' ' && c1 == 'x' && c2 == ' ') {
                    return this.found('DIMENSION', 0);
                }
                if(c == '?' && c1 == '?' && this.checkHas('??', 2)) {
                    return this.found('CITATION', 0, '<cite>');
                }
                if(c == '(' && c1 == 'c' && c2 == ')') {
                    return this.found('COPYRIGHT', 0);
                }
                if(c == '(' && c1 == 'r' && c2 == ')') {
                    return this.found('REGISTRED', 0);
                }
                if(c == '(' && c1 == 't' && c2 == 'm' && c3 == ')') {
                    return this.found('TRADEMARK', 0);
                }
                if(c == '.' && c1 == '.' && c2 == '.') {
                    return this.found('ELLIPSIS', 0);
                }
                if(c == '[' && c1.match(/\d/) && c2 == ']') {
                    return this.found('NOTE_MARK', 0);
                }
                if(c == '[' && c1.match(/\d/) && c2.match(/\d/) && c3 == ']') {
                    return this.found('NOTE_MARK', 0);
                }
                if(c == '"' && this.checkHas('":', 1, '"')) {
                    return this.found('LINK', 0, "<a ")
                }
                if(c == ' ' && c1 == '"' && !this.checkHas('":', 2, '"')) {
                    return this.found('QUOTE', 0);
                }
                if(c == '"' && c1 == ' ' && !this.checkHas('":', 2, '"')) {
                    return this.found('QUOTE', 0);
                }
                if(c == ' ' && c1 == '\'') {
                    return this.found('QUOTE', 0);
                }
                if(c == '\'' && c1 == ' ') {
                    return this.found('QUOTE', 0);
                }
                if(c == '\n' && c1 != '\n') {
                    return this.found('LINEBREAK', 1, "<br/>")
                }
           }
           if(this.state == 'PARAGRAPH' || this.state == 'BLOCKQUOTE') {
               if(c == '!' && c1.match(/\w/) && this.checkHas('!', 1)) {
                   return this.found('IMAGE', 0);
               }
           }
           if(this.state == 'STRONG') {
                if(c != '*' && c1 == '*' && c2 == '*') {
                    return this.found(this.lastState || 'PLAIN', 3, '</strong>');
                }
           }
           if(this.state == 'TODO') {
                return this.found(this.lastState || 'PLAIN', 4);
           }
           if(this.state == 'NEWPAGE') {
                return this.found(this.lastState || 'PLAIN', 4);
           }
           if(this.state == 'LINEBREAK') {
                return this.found(this.lastState || 'PLAIN', 0);
           }
           if(this.state == 'LINK') {
               if(c == '"' && c1 == ':') {
                   this.statePreviousLink = this.lastState;
                   return this.found('LINK_URL', 2);
               }                           
           }
           if(this.state == 'LINK_URL') {
               if(c.match(/\s/)) {
                   return this.found(this.statePreviousLink || 'PLAIN', 0, '</a>');
               }
               if(c.match(/[.,;]/) && c1.match(/\s/)) {
                   return this.found(this.statePreviousLink || 'PLAIN', 0, '</a>');
               }
           }
           if(this.state == 'EM') {
                if(c != '_' && c1 == '_' && c2 == '_') {
                    return this.found(this.lastState || 'PLAIN', 3, '</em>');
                }
           }
           if(this.state == 'CITATION') {
                if(c != '?' && c1 == '?' && c2 == '?') {
                    return this.found(this.lastState || 'PLAIN', 3, '</cite>');
                }
           }
           if(this.state == 'IMAGE') {
                if(c != '!' && c1 == '!') {
                    return this.found(this.lastState || 'PLAIN', 2);
                }
           }
           if(this.state == 'DASH') {
                return this.found(this.lastState || 'PLAIN', 2);
           }
           if(this.state == 'COPYRIGHT') {
                return this.found(this.lastState || 'PLAIN', 3);
           }
           if(this.state == 'REGISTRED') {
                return this.found(this.lastState || 'PLAIN', 3);
           }
           if(this.state == 'TRADEMARK') {
                return this.found(this.lastState || 'PLAIN', 4);
           }
           if(this.state == 'HYPHEN') {
                return this.found(this.lastState || 'PLAIN', 3);
           }
           if(this.state == 'DIMENSION') {
                return this.found(this.lastState || 'PLAIN', 3);
           }
           if(this.state == 'QUOTE') {
                return this.found(this.lastState || 'PLAIN', 2);
           }
           if(this.state == 'ELLIPSIS') {
                return this.found(this.lastState || 'PLAIN', 3);
           }
           if(this.state == 'NOTE_MARK') {
               if(c == ']') {
                   return this.found(this.lastState || 'PLAIN', 1);
               }
           }
           if(this.state == 'HEADING') {
               if(c == '\n' && c1 == '\n') {
                   return this.found('PLAIN', 1, '</h' + this.args.headingLevel + '></div>');
                }
           }
           if(this.state == 'PARAGRAPH') {
               if(c == '\n' && c1 == '\n') {
                   return this.found('PLAIN', 1, '</p></div>');
               }
           }
           if(this.state == 'BLOCKQUOTE') {
               if(c == '\n' && c1 == '\n') {
                   return this.found('PLAIN', 1, '</blockquote></div>');
               }
           }
           if(this.state == 'CODE') {
               if(c == '\n' && c1 == '\n') {
                   return this.found('PLAIN', 1, '</code></pre></div>');
               }
           }
           if(this.state == 'ITEM') {
               if(c == '\n' && c1 == '\n') {
                  var closeList = '</li>';
                  var l;
                  while(l = this.args.list.pop()) {
                      closeList += '</' + l +'>';                      
                  }
                  return this.found('PLAIN', 1, closeList+'</div>');
               }
           }
           if(true /** MATCH ALL**/) {
               if(c == '\n' && c1 == '\n') {
                   return this.found('PLAIN', 1);
               }
               if(c == 'T' && c1 == 'O' && c2 == 'D' && c3 == 'O') {
                   return this.found('TODO', 0);
               }
           }

       }
   }
    
});
