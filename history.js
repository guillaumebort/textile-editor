/** History for undo/redo **/
Textile.History = Textile.Utils.makeClass({
   
   commands: null,
   date: 0,
   
   constructor: function(editor) {
       this.editor = editor;
       this.commands = [];
   },
   
   add: function(command) {
       this.commands = this.commands.slice(0, this.date+1);
       this.commands.push(command);
       this.date = this.commands.length - 1;
   },
   
   undo: function() {
       var lastCommand = this.commands[this.date--];
       if(this.date < -1) this.date = -1;
       if(!lastCommand) return; // no more history
       if(lastCommand.type == 'i') {
           this.editor.model.deleteRight(lastCommand.at, true, lastCommand.txt.length);
           this.editor.cursor.toPosition(lastCommand.cursor);                       
       }
       if(lastCommand.type == 'd') {
           this.editor.model.insert(lastCommand.at, lastCommand.txt, true);
           this.editor.cursor.toPosition(lastCommand.cursor);
       }
       if(lastCommand.type == 'r') {
           this.editor.model.replace(lastCommand.from, lastCommand.from + lastCommand.newTxt.length, lastCommand.oldTxt, true);
           this.editor.cursor.toPosition(lastCommand.from);
           this.editor.selection = lastCommand.selection;
       }
       this.editor.cursor.focus();
       this.editor.paint();
   },
   
   redo: function() {
       var lastCommand = this.commands[++this.date];
       if(this.date > this.commands.length - 1) this.date = this.commands.length - 1;
       if(!lastCommand) return; // no more history
       if(lastCommand.type == 'i') {
           this.editor.model.insert(lastCommand.at, lastCommand.txt, true);
           this.editor.cursor.toPosition(lastCommand.cursor + lastCommand.txt.length);                         
       }
       if(lastCommand.type == 'd') {
           this.editor.model.deleteRight(lastCommand.at, true);
           this.editor.cursor.toPosition(lastCommand.cursor - 1);  
       }
       if(lastCommand.type == 'r') {
           this.editor.model.replace(lastCommand.from, lastCommand.from + lastCommand.oldTxt.length, lastCommand.newTxt, true);
           this.editor.cursor.toPosition(lastCommand.from);
           this.editor.selection = null;  
       }
       this.editor.cursor.focus();
       this.editor.paint();
   }
    
});
