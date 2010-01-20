/** The editor itself **/
Textile.Editor = Textile.Utils.makeClass({
    
    model: null,
    ctx: null,
    el: null,
    preview: null,
    cursor: null,
    
    lineHeight: 17,
    first_line: 1,
    gutterWidth: 40,
    paddingTop: 5,
    paddingLeft: 5,
    font: '9pt Monaco, Lucida Console, monospace',
    
    hasFocus: false,
    selection: null,
    
    constructor: function(canvasEl, previewEl) {
        this.el = (typeof(canvasEl) == 'string' ? document.getElementById(canvasEl) : canvasEl);
        if(!this.el.getContext) {
            // Too bad.
            return;
        }
        this.ctx = this.el.getContext('2d');
        if(!this.ctx.fillText) {
            // Too bad.
            return;
        }
        this.model = new Textile.Model(this.el.innerHTML, this);
        this.cursor = new Textile.Cursor(this);
        this.history = new Textile.History(this);
        this.clipboard = new Textile.Clipboard(this);
        
        // Gecko detection
        this.gecko = (document.getBoxObjectFor == undefined) ? false : true;
        
        // Events
        this.el.addEventListener('dblclick', Textile.Utils.bind(this.onDblclick, this), true);
        window.addEventListener('mousedown', Textile.Utils.bind(this.onMousedown, this), true);
        window.addEventListener('mouseup', Textile.Utils.bind(this.onMouseup, this), true);
        window.addEventListener('mousemove', Textile.Utils.bind(this.onMousemove, this), true);
        window.addEventListener('keypress', Textile.Utils.bind(this.onKeypress, this), true);
        window.addEventListener('keydown', Textile.Utils.bind(this.onKeydown, this), true);
        this.el.addEventListener('mousewheel', Textile.Utils.bind(this.onMousewheel, this), true)
        
        // Gecko hacks
        this.el.addEventListener('DOMMouseScroll', Textile.Utils.bind(this.onMousewheelGecko, this), true);
        
        // First
        this.resize(this.el.width, this.el.height);   
        
        // Preview
        if(previewEl) {
            this.preview = new Textile.Preview(this, previewEl);
        }                 
    },
    
    setContent: function(content) {
        this.model.content = content;
        this.model.update();
        this.cursor.bound();
        this.paint();
    },
    
    getContent: function() {
        return this.model.content;
    },
    
    getPosition: function() {
        var pos = $(this.el).position();
        return {
            top: pos.top + parseInt($(this.el).css('borderTopWidth')) + parseInt($(this.el).css('paddingTop')) + parseInt($(this.el).css('marginTop')),
            left: pos.left + parseInt($(this.el).css('borderLeftWidth')) + + parseInt($(this.el).css('paddingLeft')) + + parseInt($(this.el).css('marginLeft'))
        }
    },
    
    scroll: function(firstLine) {
        this.first_line = firstLine;
        if(this.onScrollHandler) {
            this.onScrollHandler(firstLine);
        }
    },
    
    onScroll: function(handler) {
        this.onScrollHandler = handler;
    },
    
    resize: function(w, h) {
        this.width = w;
        this.height = h;
        this.el.width = w;
        this.el.height = h;
        this.ctx.font = this.font;
        var txt = ' ';
        for(var i=0; i<500; i++) {
            if(this.ctx.measureText(txt).width < this.width - 10 - this.gutterWidth - 2 * this.paddingLeft) {
                txt += ' ';
            } else {
                this.charWidth = this.ctx.measureText(txt).width / txt.length;
                break;
            }
        }
        this.lineWidth = Math.round((this.width - 10 - this.gutterWidth - 2 * this.paddingLeft ) / this.charWidth);
        this.lines = Math.round((this.height - this.paddingTop * 3) / this.lineHeight);
        this.model.update();
        this.paint();
        if(this.onResizeHandler) {
            this.onResizeHandler();
        }
    },
    
    onResize: function(onResizeHandler) {
        this.onResizeHandler = onResizeHandler;
    },
    
    onMousedown: function(e) {
        if(e.target == this.el) {
            this.hasFocus = true;
            if(this.preview) {
                this.preview.edit();
            }
        } else {
            this.hasFocus = false;
            if(this.preview) {
                this.preview.stopEditing();
            }
        }
        // Scrollbar click ?
        if(e.pageX > this.getPosition().left + this.width - 20 && e.target == this.el) {
            var h = this.lines * this.lineHeight;
            var olh = h / this.model.lines.length;
            var bar = this.lines * olh;
            if(bar < 10) bar = 10;
            var o =  (this.first_line - 1) * olh;
            var y = e.pageY - this.getPosition().top - this.paddingTop;
            // The bar itself
            if(y>o && y<o+bar) {
                this.scrollBase = e.pageY;
                this.scrollBaseLine = this.first_line;
            } 
            // Up
            else if (y<o){
                this.onMousewheel({wheelDelta: 1});
            } 
            // Down
            else {
                this.onMousewheel({wheelDelta: -1});
            }
            // No select
            $('#preview').css('-webkit-user-select', 'none');
        } 
        // Text click
        else {
            this.selection = null;
            this.bp = true;   
            if(e.target == this.el) {
                this.cursor.fromPointer(this.translate(e));
                this.paint();
            } else {
                this.paint();
            }                     
        }                         
    },
    
    onDblclick: function(e) {
        var txt = this.model.lines[this.cursor.line-1].content;
        var c = this.cursor.column;
        while(txt.charAt(c).match(/\w/) && c > -1) {
            c--;
        }
        c++;
        this.selection = {
            anchor: this.cursor.getPosition(),
            from: c + this.model.lines[this.cursor.line-1].offset,
            to: null
        }
        c = this.cursor.column + 1;
        while(txt.charAt(c).match(/\w/) && c < txt.length) {
            c++;
        }
        this.selection.to = c + this.model.lines[this.cursor.line-1].offset;
        this.paint();
    },
    
    onMouseup: function(e) {
        // Clear all stuff
        this.bp = false;
        this.scrollBase = null;
        clearTimeout(this.autoscroller);
        // No select
        $('#preview').css('-webkit-user-select', '');
        if(this.selection && (this.selection.from == null || this.selection.to == null)) {
            this.selection = null;
        }
    },
    
    onMousemove: function(e) {
        // Change cursor automatically
        if(e.pageX > this.getPosition().left + this.width - 20 && e.target == this.el) {
            this.el.style.cursor = 'default';
        } else {
            this.el.style.cursor = 'text';
        }
        if(!this.hasFocus) return;
        // A scroll ?
        if(this.scrollBase) {
            var h = this.lines * this.lineHeight;
            var olh = h / this.model.lines.length;
            var line = Math.round((e.pageY - this.scrollBase) / olh) + this.scrollBaseLine;
            this.onMousewheel({}, line);
            return;
        }
        // A selection ?
        if(this.bp) {
            if(!this.selection) {
                this.selection = {
                    anchor: this.cursor.getPosition(),
                    from: null,
                    to: null
                }
            } else {
                this.cursor.fromPointer(this.translate(e));
                var newBound = this.cursor.getPosition();
                if(newBound < this.selection.anchor && this.selection.from != newBound) {
                    this.selection.from = newBound;
                    this.selection.to = this.selection.anchor;
                    this.paint();
                }
                if(newBound > this.selection.anchor && this.selection.to != newBound) {
                    this.selection.from = this.selection.anchor;
                    this.selection.to = newBound;
                    this.paint();
                }                            
                if(newBound == this.selection.anchor && this.selection.from != null) {
                    this.selection.from = null;
                    this.selection.to = null;
                    this.paint();
                }
            }
        }
        // Auto-scroll while selecting
        var auto = false;
        if(this.bp) {
            if(e.pageY < this.getPosition().top) {
                this.onMousewheel({wheelDelta: 1});     
                auto = true;                       
            } 
            if(e.pageY > this.getPosition().top + this.height) {
                this.onMousewheel({wheelDelta: -1});
                auto = true;
            }
        }
        clearTimeout(this.autoscroller);
        if(auto) {
            this.autoscroller = setTimeout(Textile.Utils.bind(function() {
                this.onMousemove(e);
            }, this), 10);
        }                   
    },
    
    onMousewheel: function(e, o) {
        // Hack. Call it with e = null, for direct line access
        if(o != null) {
           this.scroll(o); 
        } else {
            var delta = e.wheelDelta;
            if(delta > 0) {
                this.scroll(this.first_line-1);                      
            } else {
                this.scroll(this.first_line+1);           
            }
        }
        if(e.preventDefault) e.preventDefault();
        this.cursor.bound();
        this.paint();
    },
    
    onMousewheelGecko: function(e) {
        if(e.axis == e.VERTICAL_AXIS) {
            this.onMousewheel({
                wheelDelta: -e.detail
            });
            e.preventDefault();
        }
    },
    
    onKeypress: function(e) {
        if(!e.charCode || e.charCode == 13 || e.keyCode == 8) {
            if(this.gecko) this.onKeydown(e, true);
            return;
        }
        if(this.hasFocus) {
            this.cursor.show = true;
            var position = this.cursor.getPosition();
            if(e.metaKey || e.ctrlKey) {
                if(e.charCode == 97) {
                    e.preventDefault();
                    this.selection = {
                        anchor: 0,
                        from: 0,
                        to: this.model.content.length
                    }
                    this.paint();
                }
                if(e.charCode == 122) {
                    this.history.undo();
                }
                if(e.charCode == 121) {
                    this.history.redo();
                }
                if(e.charCode == 120) {
                    this.clipboard.cut();
                }
                if(e.charCode == 118) {
                    this.clipboard.paste();
                }
                if(e.charCode == 99) {
                    this.clipboard.copy();
                }
                return;
            }                       
            // CHARS
            var c = String.fromCharCode(e.charCode);
            e.preventDefault();
            if(this.selection) {
                this.model.replace(this.selection.from, this.selection.to, c);
                this.cursor.toPosition(this.selection.from + 1);
                this.selection = null;
            } else {
                this.model.insert(position, c);
                this.cursor.toPosition(position + 1);                         
            }
            this.cursor.focus();
        }
    },
    
    onKeydown: function(e, force) {
        if(this.hasFocus && (!this.gecko || force)) {
            if(e.metaKey || e.ctrlKey) {
                return;
            }
            this.cursor.show = true;
            // ~~~~ MOVE
            if(e.keyCode == 40) {
                e.preventDefault();
                this.cursor.lineDown();
                this.cursor.focus();
                return;
            }
            if(e.keyCode == 38) {
                e.preventDefault();
                this.cursor.lineUp();
                this.cursor.focus();
                return;
            }
            if(e.keyCode == 37) {
                e.preventDefault();
                this.cursor.left();
                this.cursor.focus();
                return;
            }
            if(e.keyCode == 39) {
                e.preventDefault();
                this.cursor.right();
                this.cursor.focus();
                return;
            }   
            // ~~~~ With pos
            var position = this.cursor.getPosition();
            // ENTER
            if(e.keyCode == 13) {
                e.preventDefault();
                if(this.selection) {
                    this.model.replace(this.selection.from, this.selection.to, '\n');
                    this.cursor.toPosition(this.selection.from + 1);
                    this.selection = null;
                } else {
                    this.model.lineBreak(position);
                    this.cursor.toPosition(position+1);                                
                }
                this.cursor.focus();
                return;
            }
            // BACKSPACE
            if(e.keyCode == 8) {
                e.preventDefault();
                if(this.selection) {
                    this.model.replace(this.selection.from, this.selection.to, '');
                    this.cursor.toPosition(this.selection.from);
                    this.selection = null;
                } else {
                    this.model.deleteLeft(position);
                    this.cursor.toPosition(position - 1);
                }
                this.cursor.focus();
                return;
            }
            // TAB
            if(e.keyCode == 9) {
                e.preventDefault();
                if(this.selection) {
                    this.model.replace(this.selection.from, this.selection.to, '    ');
                    this.cursor.toPosition(this.selection.from + 4);
                    this.selection = null;
                } else {
                    this.model.insert(position, '    ');
                    this.cursor.toPosition(position + 4);                            
                }
                this.cursor.focus();
                return;
            }
            // SUPPR 
            if(e.keyCode == 46) {
                e.preventDefault();
                this.model.deleteRight(position);
                this.cursor.toPosition(position);
                this.cursor.focus();
                return;
            }                 
        }
    },
    
    translate: function(e) {
        var pos = this.getPosition();
        return {
            x: e.pageX - pos.left - this.gutterWidth - this.paddingLeft,
            y: e.pageY - pos.top - this.paddingTop
        }
    },
    
    updateCursor: function() {
        this.showCursor = this.hasFocus && !this.showCursor;
        this.paint();
    },
    
    paint: function() {
        this.paintBackground();
        this.paintLineNumbers();
        this.paintSelection();
        this.paintContent();
        this.paintScrollbar();
        this.paintCursor();
    },
    
    paintBackground: function() {
        var style = Textile.Theme['PLAIN'];
        if(style && style.background) {
            this.ctx.fillStyle = style.background;
        } else {
            this.ctx.fillStyle = '#000';            
        }
        this.ctx.fillRect(0, 0, this.width, this.height);
        //
        var parser = new Textile.Parser(this.model, this.first_line, this.first_line + this.lines - 1);
        var token = parser.nextToken();
        var x = 0, y = 1;
        while(token.type != 'EOF') {
            var style = Textile.Theme[token.type];
            if(style && style.background) {
                this.ctx.fillStyle = style.background;
                for(var i=token.startLine-this.first_line; i<=token.endLine-this.first_line; i++) {
                    this.ctx.fillRect(this.gutterWidth + this.paddingLeft, (i) * this.lineHeight + this.paddingTop, this.charWidth * (this.lineWidth-1), this.lineHeight);
                }
            }          
            // Yop
            token = parser.nextToken();
        }
    },
    
    paintSelection: function() {
        if(this.hasFocus) {
            var style = Textile.Theme['SELECTION'];
            if(style && style.background) {
                this.ctx.fillStyle = style.background;
            } else {
                this.ctx.fillStyle = 'rgba(255,255,255,.2)';                
            }
            if(!this.selection) {               
                if(this.cursor.isVisible()) {  
                    this.ctx.fillRect(this.gutterWidth + 1, (this.cursor.line - this.first_line) * this.lineHeight + this.paddingTop, this.width - this.gutterWidth, this.lineHeight);
                }
            } else {
                this.cursor.toPosition(this.selection.from);
                var fl = this.cursor.line, fc = this.cursor.column;
                this.cursor.toPosition(this.selection.to);
                var tl = this.cursor.line, tc = this.cursor.column;
                if(fl == tl) {
                    this.ctx.fillRect(this.gutterWidth + this.paddingLeft + fc * this.charWidth, (fl - this.first_line) * this.lineHeight + this.paddingTop, (tc - fc) * this.charWidth, this.lineHeight);
                } else {
                    for(var i=fl; i<=tl; i++) {
                        if(this.cursor.isLineVisible(i)) {
                            if(i == fl) {
                                this.ctx.fillRect(this.gutterWidth + this.paddingLeft + fc * this.charWidth, (i - this.first_line) * this.lineHeight + this.paddingTop, (this.lineWidth-fc-1) * this.charWidth, this.lineHeight);
                                continue;
                            }
                            if(i == tl) {
                                this.ctx.fillRect(this.gutterWidth + this.paddingLeft, (i - this.first_line) * this.lineHeight + this.paddingTop, tc * this.charWidth, this.lineHeight);
                                continue;
                            }
                            this.ctx.fillRect(this.gutterWidth + this.paddingLeft, (i - this.first_line) * this.lineHeight + this.paddingTop, (this.lineWidth-1) * this.charWidth, this.lineHeight);
                        }
                    }
                }
            }
        }
    },
    
    paintLineNumbers: function() {
        this.ctx.fillStyle = '#DEDEDE';
        this.ctx.fillRect(0, 0, this.gutterWidth, this.height);
        this.ctx.fillStyle = '#8E8E8E';
        this.ctx.fillRect(this.gutterWidth, 0, 1, this.height);
        this.ctx.font = this.font;
        var previousLine = null;
        var rl = 1;
        for(var i=this.first_line; i<this.first_line + this.lines; i++) {
            if(i > this.model.lines.length) {
                break;
            }
            if(this.hasFocus && !this.selection && this.model.lines[i-1].line == this.model.lines[this.cursor.line-1].line) {
                 this.ctx.fillStyle = '#000000'; 
            } else {
                this.ctx.fillStyle = '#888888';                            
            }
            var ln = '';
            if(false) {
                // debug
                ln = i+'';
            } else {
                if(this.model.lines[i-1].line == previousLine) {
                    ln = '\u00B7';
                } else {
                    previousLine = (this.model.lines[i-1].line);
                    ln = previousLine + '';
                }
            }
            var w = ln.length * 8;
            this.ctx.fillText(ln, this.gutterWidth - this.paddingLeft - w, rl++ * this.lineHeight + this.paddingTop - 4);
        }
    },
    
    paintContent: function() {
        var parser = new Textile.Parser(this.model, this.first_line, this.first_line + this.lines - 1);
        var token = parser.nextToken();
        var x = 0, y = 1;
        while(token.type != 'EOF') {
            if(token.text) {
                var style = Textile.Theme[token.type];        
                if(style && style.color) {
                    this.ctx.fillStyle = style.color;
                } else {
                    this.ctx.fillStyle = '#FFF';                            
                }
                if(style && style.fontStyle) {
                    this.ctx.font = style.fontStyle + ' ' + '12px Monaco, Lucida Console, monospace'; 
                } else {
                    this.ctx.font = '12px Monaco, Lucida Console, monospace';                         
                }
                if(token.text.indexOf('\n') > -1 || token.text.indexOf('\r') > -1) {
                    var lines = token.text.split(/[\n\r]/);
                    for(var i=0; i<lines.length; i++) {
                        if(token.startLine + i >= y + this.first_line - 1 && token.startLine + i <= this.first_line + this.lines - 1) {
                            this.ctx.fillText(lines[i], this.gutterWidth + this.paddingLeft + x * this.charWidth, y * this.lineHeight + this.paddingTop - 4);                        
                            x += lines[i].length;
                            if(i < lines.length - 1 ) {
                                x = 0; y++;
                            }
                        }
                    }
                } else {
                    if(token.startLine >= y + this.first_line - 1 && token.startLine <= this.first_line + this.lines - 1) {      
                        this.ctx.fillText(token.text, this.gutterWidth + this.paddingLeft + x * this.charWidth, y * this.lineHeight + this.paddingTop - 4);                        
                        if(style && style.underline) {
                            this.ctx.fillRect(this.gutterWidth + this.paddingLeft + x * this.charWidth, y * this.lineHeight + this.paddingTop - 4 + 1, token.text.length * this.charWidth + 1, 1);
                        }
                        x += token.text.length;
                    }
                }
            }
            // Yop
            token = parser.nextToken();
        }
    },
    
    paintCursor: function() {
        if(this.hasFocus && this.cursor.show && !this.selection && this.cursor.isVisible()) {
            this.ctx.fillStyle = '#FFF';
            this.ctx.fillRect(this.gutterWidth + this.paddingLeft + this.cursor.column * this.charWidth, this.paddingTop + ((this.cursor.line - this.first_line) * this.lineHeight), 1, this.lineHeight);
        }
    },
    
    paintScrollbar: function() {
        if(this.model.lines.length > this.lines) {
            var h = this.lines * this.lineHeight;
            var olh = h / this.model.lines.length;
            var bar = this.lines * olh;
            var o =  (this.first_line - 1) * olh; 
            // Draw
            this.ctx.strokeStyle = 'rgba(255, 255, 255, .5)';                
            this.ctx.lineWidth = 10;
            this.ctx.beginPath();
            this.ctx.moveTo(this.width - 10, this.paddingTop + o);
            this.ctx.lineTo(this.width - 10, this.paddingTop + o + bar);
            this.ctx.stroke();
        }
    }
    
});