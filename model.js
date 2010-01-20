/** Textile document model **/
Textile.Model = Textile.Utils.makeClass({
   
   content: '',
   lines: [],
   editor: null,
   
   constructor: function(txt, editor) {
       this.content = txt;
       this.editor = editor;
       this.update();
   },
   
   update: function() {
       this.lines = [];
       if(!this.editor.lineWidth) {
           return;
       }
       var offset = 0;
       var lines = this.content.split('\n');
       for(var i=0; i<lines.length; i++) {
           var line = lines[i];
           while(line != null) {
               var part = line.substring(0, this.editor.lineWidth);
               if(part.length == this.editor.lineWidth) {
                   if(part.indexOf(' ') > -1) {
                       part = part.substring(0, part.lastIndexOf(' ') + 1); // Soft wrap on space char
                   } else {
                       part = part.substring(0, part.length); // force
                   }
               }
               this.lines.push({
                  line: i+1,
                  content: part,
                  offset: offset
               });
               offset += part.length;
               if(line.length > part.length) {
                   line = line.substring(part.length);
                   if(!line) line = null;
               } else {
                   line = null;
               }
           }
           offset++; // count linebreak
       }
       if(this.onChangeHandler) {
           this.onChangeHandler();
       }
   },
   
   insert: function(position, txt, noHistory) {
       this.content = this.content.substring(0, position) + txt + this.content.substring(position);
       if(!noHistory) {
           this.editor.history.add({
              type: 'i',
              at: position,
              txt: txt,
              cursor: this.editor.cursor.getPosition() 
           });
       }
       this.update();
   },
   
   replace: function(from, to, txt, noHistory) {
       var deleted = this.content.substring(from, to);
       if(!noHistory) {
           this.editor.history.add({
              type: 'r',
              from: from,
              newTxt: txt,
              oldTxt: deleted,
              selection: this.editor.selection
           });
       }
       this.content = this.content.substring(0, from) + txt + this.content.substring(to);
       this.update();
   },
   
   lineBreak: function(position, noHistory) {
       this.insert(position, '\n');
   },
   
   deleteLeft: function(position, noHistory) {
       var deleted = this.content.substring(position - 1, position);
       if(!noHistory) {
           this.editor.history.add({
               type: 'd',
               at: position - 1,
               txt: deleted,
               cursor: this.editor.cursor.getPosition()
           });
       }
       this.content = this.content.substring(0, position - 1) + this.content.substring(position);                   
       this.update();
   },
   
   deleteRight: function(position, noHistory, size) {
       if(!size) size = 1;
       var deleted = this.content.substring(position, position + size);
       if(!noHistory) {
           this.editor.history.add({
               type: 'd',
               at: position,
               txt: deleted,
               cursor: this.editor.cursor.getPosition()
           });
       }
       this.content = this.content.substring(0, position) + this.content.substring(position + size);
       this.update();
   },
   
   onChange: function(handler) {
       this.onChangeHandler = handler;
   }
    
});