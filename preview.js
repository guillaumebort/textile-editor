/** Preview processor **/
Textile.Preview = Textile.Utils.makeClass({
    
    constructor: function(editor, el) {
        this.editor = editor;
        this.el = (typeof(el) == 'string' ? document.getElementById(el) : el);
        this.pageWidth = $('#doc').width();
        this.editor.model.onChange(Textile.Utils.bind(this.onChange, this));
        this.editor.cursor.onChange(Textile.Utils.bind(this.cursorChanged, this));
        this.editor.onScroll(Textile.Utils.bind(this.onScroll, this));
        this.editor.onResize(Textile.Utils.bind(this.onResize, this));
        this.render();
    },

    onChange: function() {
        this.render();
    },
    
    edit: function() {
        $(this.el).addClass('editing');       
    },
    
    stopEditing: function() {
        $(this.el).removeClass('editing');
    },
    
    onScroll: function() {
        this.cursorChanged('now');
    },
    
    onResize: function() {
        return;
        var w = $('#preview').width();
        this.zoom = (w / 815);
        $('#preview').css('zoom', (this.zoom*100)+'%');        
    },
    
    cursorChanged: function(speed) {
        if(this.editor.hasFocus) {
            if(this.editor.model.lines[this.editor.cursor.line-1].content && !this.editor.selection) {
                var focusTo = this._currentBlockLine(this.editor.cursor.line);
                var block = focusTo[0];
                var line = focusTo[1];
                if(!$(block).is('.currentBlock')) {
                    $('*').removeClass('currentBlock');
                    $(block).addClass('currentBlock');                   
                }
                // Compute offset
                var offset = (line - this.editor.first_line) * this.editor.lineHeight;
                $(this.el).scrollTo(block, (speed == 'now' ? 0 : 'fast'), {offset: {top:-offset}, axis:'y', onAfter: function() {
                    //
                }});
            } else {
                $('*').removeClass('currentBlock');
            }            
        }
    },
    
    _currentBlockLine: function(line) {
        while(line > 0) {
            var el = document.getElementById('line'+line);
            if(el) {
                return [el,line];
            }
            line--;
        }
    },
    
    render: function() {
        var parser = new Textile.Parser(this.editor.model);
        var token = parser.nextToken();
        var html = '<div id="doc">';
        var lines = [];
        while(token.type != 'EOF') {
            html += this.textile2HTML(token);
            //html += this.markLine(token);
            if(token.tag) {                
                html += token.tag;
            }
            token = parser.nextToken();
        }
        html += '</div>';
        this.el.innerHTML = html; 
    },
    
    textile2HTML: function(token) {
        if(token.type == 'BLOCK_START') { // skip
            return '';
        }
        if(token.type == 'STRONG') { // remove **
            return token.text.replace(/^\*\*|\*\*$/g, '');
        }
        if(token.type == 'EM') { // remove **
            return token.text.replace(/^__|__$/g, '');
        }
        if(token.type == 'CITATION') { // remove ??
            return token.text.replace(/^\?\?|\?\?$/g, '');
        }
        if(token.type == 'BLOCK_STYLE') { // transform as class=""
            return 'class="' + token.text.replace(/[()]/g, '') + '">';
        }
        if(token.type == 'DASH') { // -- to HTML entity
            return '&#8212;';
        }
        if(token.type == 'COPYRIGHT') { // (c) to HTML entity
            return '&#169;';
        }
        if(token.type == 'TRADEMARK') { // (tm) to HTML entity
            return '&#8482;';
        }
        if(token.type == 'REGISTRED') { // (r) to HTML entity
            return '&#174;';
        }
        if(token.type == 'ELLIPSIS') { // ... to HTML entity
            return '&#8230;';
        }
        if(token.type == 'HYPHEN') { // single - to HTML entity
            return ' &#8211; ';
        }
        if(token.type == 'DIMENSION') { // x - to HTML entity
            return ' &#215; ';
        }
        if(token.type == 'CODE') { // trim and replace < by &lt;
            return token.text.replace(/</g, '&lt;').replace(/^\s+/, '');
        }
        if(token.type == 'IMAGE') { // build image
            return '<img src="' + token.text.replace(/^!|!$/g, '') + '" />';
        }
        if(token.type == 'LINK') { // save text for later
            this.linkText = token.text.replace(/^"|":$/g, '');
            return '';
        }
        if(token.type == 'LINK_URL') { // link
            return 'href="' + token.text + '">' + this.linkText;
        }
        if(token.type == 'ITEM_START') { // skip
            return '';
        }
        if(token.type == 'NEWPAGE') { // skip
            return '<hr class="endpage" /><hr class="startpage" />';
        }
        if(token.type == 'QUOTE') { // Curly quote
            if(token.text == ' "') {
                return ' &#8220;';
            }
            if(token.text == '\n"') {
                return '\n&#8220;';
            }
            if(token.text == '" ') {
                return '&#8221; ';
            }
            if(token.text == ' \'') {
                return ' &#145;';
            }
            if(token.text == '\' ') {
                return '&#146; ';
            }
        }
        return token.text;
    }
    
});