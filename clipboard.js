/** Pretty dumb clipboard implementation **/
Textile.Clipboard = Textile.Utils.makeClass({
    
    constructor: function(editor) {
        this.editor = editor;
        this.clipboard = document.createElement('textarea');
        document.body.appendChild(this.clipboard);
        this.clipboard.style.position = 'absolute';
        this.clipboard.style.width = '100px';
        this.clipboard.style.height = '100px';
        this.clipboard.style.top = this.editor.getPosition().top + 'px';
        this.clipboard.style.left = '-999em';
        this.clipboard.autocomplete = 'off';
        this.clipboard.tabIndex = '-1';
    },
    
    cut: function() {
        var data = this.selected();
        if(data) {
            this.copyToClipboard(data);
            this.editor.model.replace(this.editor.selection.from, this.editor.selection.to, '');
            this.editor.cursor.toPosition(this.editor.selection.from);
            this.editor.selection = null;
            this.editor.cursor.focus();
            this.editor.paint();
        }
    },
    
    copy: function() {
        var data = this.selected();
        if(data) {
            this.copyToClipboard(data);
        }                    
    },
    
    paste: function() {
        this.clipboard.select();
        setTimeout(Textile.Utils.bind(function() {
            var data = this.clipboard.value;
            if(data) {
                if(this.editor.selection) {
                    this.editor.model.replace(this.editor.selection.from, this.editor.selection.to, data);
                    this.editor.cursor.toPosition(this.editor.selection.from + data.length);
                    this.editor.selection = null;
                } else {
                    this.editor.model.insert(this.editor.cursor.getPosition(), data);
                    this.editor.cursor.toPosition(this.editor.cursor.getPosition() + data.length);                         
                }
                this.editor.cursor.focus();
                this.editor.paint();    
            }
        }, this), 0);                    
    },
    
    copyToClipboard: function(data) {
        this.clipboard.value = data;
        this.clipboard.select();
    },
    
    selected: function() {
        if(!this.editor.selection) {
            return '';
        }
        return this.editor.model.content.substring(this.editor.selection.from, this.editor.selection.to);
    }
    
});
