# a textile editor,

## built over HTML5 canvas

I'm pretty sure that textile is the right way to produce content for the web, and that WYSIWYG editors are bad for your website. But editing a large chunk of textile using a textarea is not fun. I usually use Textmate to edit textile content, and wanted to reproduce the same feeling inside a browser.

The best online text editor is currently Bespin and I gave it a try. Unfortunately, the current state of bespin make it pretty difficult to embed the editor itself in a standalone way. Moreover I needed specifics features like 'soft wrap' that is totally required to edit some textile content.

So I took the Bespin way, and started to hack using javascript and HTML5 canvas to create a simple, standalone and totally embeddable textile editor for the web.