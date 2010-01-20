/** Cursor **/
Textile.Cursor = Textile.Utils.makeClass({
   
   line: 1,
   column: 0,
   pref_column: 0,
   show: false,
   editor: null,
   
   constructor: function(editor) {
        this.editor = editor;
        setInterval(Textile.Utils.bind(this.toggle, this), 500);
   },
   
   onChange: function(handler) {
       this.onChangeHandler = handler;
   },
   
   _notify: function(speed) {
       if(this.onChangeHandler) {
           this.onChangeHandler(speed);
       }
   },
   
   toggle: function() {
        if(this.editor.hasFocus) {
            this.show = !this.show;
            this.editor.paint();
        }
   },
   
   fromPointer: function(position) {
        this.line = Math.round((position.y + (this.editor.lineHeight/2)) / this.editor.lineHeight) + this.editor.first_line - 1;
        this.column = Math.round(position.x / this.editor.charWidth);
        this.pref_column = this.column;
        this.bound();    
        this.show = true;   
        this._notify();         
   },
   
   isVisible: function() {
        return this.isLineVisible(this.line);
   },
   
   isLineVisible: function(line) {
        return line >= this.editor.first_line && line < this.editor.first_line + this.editor.lines;
   },
   
   focus: function() {
        if(!this.isVisible()) {
            if(this.line < this.editor.first_line) {
                this.editor.first_line = this.line;
            } else {
                this.editor.first_line = this.line - this.editor.lines + 1;
            }
        }
        this.editor.paint();
        this._notify('now');        
   },
   
   lineDown: function() {
       if(this.editor.selection) {
           this.toPosition(this.editor.selection.to);
           this.editor.selection = null;
       }
       this.line++;
       if(this.pref_column > this.column) {
           this.column = this.pref_column;
       }
       this.bound();     
   },
   
   lineUp: function() {
       if(this.editor.selection) {
           this.toPosition(this.editor.selection.from);
           this.editor.selection = null;
       }
       this.line--;
       if(this.pref_column > this.column) {
           this.column = this.pref_column;
       }
       this.bound();     
   },
   
   left: function() {
       if(this.editor.selection) {
           this.toPosition(this.editor.selection.from);
           this.editor.selection = null;
       } else {
           this.toPosition(this.getPosition() - 1);
       }
       this.pref_column = this.column;
   },
   
   right: function(keyboardSelect) {
       if(!keyboardSelect && this.editor.selection) {
           this.toPosition(this.editor.selection.to);
           this.editor.selection = null;
       } else {
           this.toPosition(this.getPosition() + 1);
       }
       this.pref_column = this.column;
   },
   
   bound: function() {
       if(this.line < 1) {
           this.line = 1; 
       }
       if(this.editor.first_line < 1) {
           this.editor.first_line = 1;
       }
       if(this.line > this.editor.model.lines.length) {
           this.line = this.editor.model.lines.length;
       }
       if(this.editor.first_line > this.editor.model.lines.length - this.editor.lines + 1) {
           this.editor.first_line = this.editor.model.lines.length - this.editor.lines + 1;
           if(this.editor.first_line < 1) {
               this.editor.first_line = 1;
           }
       }
       if(this.column < 0) {
           this.column = 0;
       }
       var content = this.editor.model.lines[this.line - 1].content;
       if(this.column > content.length) {
           this.column = content.length;
       }
   },
   
   getPosition: function() {
       return this.editor.model.lines[this.line - 1].offset + this.column;
   },
   
   toPosition: function(position) {
       if(!position || position < 0) {
           position = 0;
       }
       for(var i=0; i<this.editor.model.lines.length; i++) {
           if(this.editor.model.lines[i].offset > position) {
               this.line = i;
               this.column = position - this.editor.model.lines[i-1].offset;
               this.pref_column = this.column;
               if(this.line < 1) {
                   return;
               }
               this.bound();
               return;
           }
       }
       this.line = this.editor.model.lines.length;
       this.column = position - this.editor.model.lines[i-1].offset;
       this.pref_column = this.column;
       if(this.line < 1) {
           return;
       }
       this.bound();
   }
    
});