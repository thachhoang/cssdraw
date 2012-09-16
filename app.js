var $body, $frame, doc, editor;
var t;
var mode = "gui";
var updateView, updateEditor;
var curr; // selected object
window.onload = init;
//window.onbeforeunload = function(){ return "For now, the only way to save your work is to click \"Use text editor\" and copy everything."; };
function init(){
    editor = ace.edit("editor");
    var HTMLMode = ace.require("ace/mode/html").Mode;
    editor.getSession().setMode(new HTMLMode());
    editor.getSession().setUseWrapMode(true);
    editor.setShowPrintMargin(false);
    editor.renderer.setHScrollBarAlwaysVisible(false);
    $.get("default.html", function(data){
        //editor.getSession().setValue(data);
        $body = $("#viewport");
        $body.html(data);
        updateView = function(){
            $body.html(editor.getSession().getValue());
        }
        updateEditor = function(){
            editor.getSession().setValue($body.html());
        }
        updateEditor();
        editor.getSession().on("change", function(){
            clearTimeout(t);
            t = setTimeout(updateView, 200);
        });
        $(window).resize(function(){
            updateSel('');
        });
        setUI(mode);
    });
}
function updateSel(mode){
    // reset the "highlight" to match the selected elt's size and position
    var sel = $('#selector');
    sel.hide();
    sel.attr('style', '');
    // nothing currently selected?
    if (curr == null) return;
    d = curr;
    d.after(sel);
    var props = //['padding', 'padding-top', 'padding-bottom', 'padding-left', 'padding-right',
                ['margin', 'margin-left', 'margin-top', 'margin-right', 'margin-bottom',
                 getTransformProperty(),
                 'left', 'top', 'right', 'bottom'];
    $.each(props, function(i, val){
        sel.matchCSS(val);
    });
    /*
    if (mode == 'pos' || mode == ''){
        var dset = d.position();
        var seltop = -2, selleft = -2;
        //alert(dset.top);
        if (sel.css('left') === 'auto'){
            seltop += dset.top + parseInt(sel.css('margin-top').replace('px', ''), 10);
            selleft += dset.left + parseInt(sel.css('margin-left').replace('px', ''), 10);
        }
        sel.offset({ top: seltop, left: selleft });
    }
    */
    if (mode == 'size' || mode == ''){
        sel.width(d.outerWidth() - 4);
        sel.height(d.outerHeight() - 4);
    }
    sel.show();
}
jQuery.fn.matchCSS = function(prop) {
    if (prop == null || prop == '' || curr == null)
        return;
    $(this).css(prop, curr.css(prop));
}
function output(o){
    $('#output').html(o);
}
function setUI(m){
    if (m == "gui"){
        mode = "gui";
        $('#editor').hide();
        $('#mode-gui').hide();
        updateView();
        updateFancyFields();
        updatePosFields();
        $('input[name=origin]').click(function(){
            updatePosFields();
        });
        $('input.adjuster').change(function(){
            if (curr == null) return;
            d = curr;
            var prop = $(this).attr('name');
            var patt, val;
            if (prop == 'id'){
                patt = /[A-Za-z][-A-Za-z0-9_:.]*/;
                val = $(this).val().replace(' ', '').match(patt);
                //alert(val);
                if (val == null) return;
                d.attr('id', val);
            } else {
                patt = /(auto|0|(-?([0-9])+(px|%)))/;
                val = patt.exec($(this).val())[0];
                if (val == null) return;
                if (val.indexOf("%") != -1){
                    //alert('%');
                    d.attr('data-rel-'+prop, val);
                } else {
                    d.removeAttr('data-rel-'+prop);
                }
                /*
                if ($(this).hasClass('pos')){
                    d.css('position', 'absolute');
                }
                */
                d.css(prop, val);
                if (prop == 'right'){
                    d.css('left', '');
                } else if (prop == 'bottom'){
                    d.css('top', '');
                }
            }
            $(this).val(val);
            //alert(val);
            updateSel('');
        });
        $('#color-adjuster input').change(function(e){
            updateSelBasicColors(e);
        });
        $('#color-adjuster select[name="border-style"]').change(function(){
            updateSelBasicColors();
        });
        $('#color-adjuster select[name="border-selection"]').change(function(){
            if (curr != null) updateBasicColorFields(curr);
        });
        clearTimeout(t);
        $("#viewport").on("click", function(e){
            if (mode != "gui") return;
            if (e.target.id == 'viewport'){
                removeCurr();
                return;
            }
            if (e.target.id == 'rotation-handle') return;
            if (e.target.id == 'skewx-handle') return;
            if (e.target.id == 'skewy-handle') return;
            //alert($(e.target).hasClass('ui-resizable-handle'));
            if ($(e.target).hasClass('ui-resizable-handle')) return;
            //alert(e.target.id);
            removeCurr();
            curr = $(e.target);
            selectCanvasOrigin();
            updatePosFields();
            updateFancyFields();
            updateSel('');
            curr.css('position', 'absolute');
            curr.draggable({
                containment: "#viewport",
                stop: function(){
                    /*
                    $.each(['left', 'right', 'top', 'bottom'], function(i, val){
                        curr.removeAttr('data-rel-'+val);
                    });
                    */
                    updateFancyFields();
                    updateSel('');
                    //updateDistanceFromRBOrigin();
                }
            });
            curr.resizable({
                stop: function(){
                    /*
                    $.each(['width', 'height'], function(i, val){
                        curr.removeAttr('data-rel-'+val);
                    });
                    */
                    recalcRelSize();
                    updateFancyFields();
                    updateSel('');
                }
            });
            $('<div></div>').appendTo(curr).attr('id', 'rotation-handle');
            var rotationHandle = $('#rotation-handle', curr);
            rotationHandle.unbind('click');
            rotationHandle.click(function(event){
                handle = $(this);
                handle.css('background-color', 'white');
                var offset = getViewOffset(curr[0]);
                $(document).bind('mousemove', function(evt){
                    rotationHandler(evt, offset);
                });
                $(document).mouseup(function(e){
                    $(document).unbind('mousemove');
                    handle.css('background-color', 'black');
                });
            });
            $('<div></div>').appendTo(curr).attr('id', 'skewx-handle');
            var skewXHandle = $('#skewx-handle', curr);
            skewXHandle.unbind('click');
            skewXHandle.click(function(event){
                skewClickHandler(event, 'skewX');
            });
            $('<div></div>').appendTo(curr).attr('id', 'skewy-handle');
            var skewXHandle = $('#skewy-handle', curr);
            skewXHandle.unbind('click');
            skewXHandle.click(function(event){
                skewClickHandler(event, 'skewY');
            });
        });
        //$("#viewport").children().css("cursor", "pointer");
        $('#fancy-editor').show();
        $('#mode-text').show();
    } else if (m == "text"){
        mode = "text";
        $('#mode-text').hide();
        $('#fancy-editor').hide();
        removeCurr();
        //$("#viewport").children().css("cursor", "");
        updateEditor();
        $('#editor').show();
        $('#mode-gui').show();
    }
}
function recalcRelSize(){
    if (curr == null) return;
    d = curr;
    $('input.adjuster.size').each(function(){
        var prop = $(this).attr('name'),
            val = $(this).val();
        
        if (val.indexOf("%") != -1){
            var p = d.parent();
            var perc;
            if (prop == 'width'){
                perc = Math.round(d.width() * 100 / p.width());
            } else if (prop == 'height'){
                perc = Math.round(d.height() * 100 / p.height());
            } else {
                return;
            }
            var newVal = perc + '%';
            //alert(newVal);
            d.css(prop, newVal);
            d.attr('data-rel-'+prop, newVal);
        }
    });
}
function newElement(){
    $container = (curr == null) ? $('#viewport') : curr;
    var $shape = $('<div>');
    $shape.css({
        'top':    0,
        'left':   0,
        'width':  150,
        'height': 100,
        'position': 'absolute',
        'background-color': '#'+Math.floor(Math.random()*16777215).toString(16)
    });
    $shape.appendTo($container);
}
function deleteSel(){
    if (curr != null){
        var temp = curr;
        removeCurr();
        temp.remove();
        clearFancyFields();
    }
}
function clearFancyFields(){
    $('input[type=text]').each(function(){
        if (!$(this).hasClass('color')){
            $(this).val('');
        }
    });
}
function skewClickHandler(event, skewDir){
    var handle = $(event.target);
    handle.css('background-color', 'white');
    var offset = getViewOffset(curr[0]);
    $(document).bind('mousemove', function(e){
        skewHandler(e, offset, skewDir);
    });
    $(document).mouseup(function(e){
        $(document).unbind('mousemove');
        handle.css('background-color', 'black');
    });
}
function getVendorPrefix() {
    var property = {
        transformProperty : '',
        MozTransform : '-moz-',
        WebkitTransform : '-webkit-',
        OTransform : '-o-',
        msTransform : '-ms-'
    };
    var m = document.createElement('modernizr'),
		m_style = m.style;
    for (var p in property) {
        if (typeof m_style[p] != 'undefined') {
            return property[p];
        }
    }
    return null;
}
function getTransformProperty(){
	var vendorPrefix = getVendorPrefix();
	return (vendorPrefix !== null) ? vendorPrefix + 'transform' : null;
}
function clearTransform(){
    var transformPropName = getTransformProperty();
    if (transformPropName == null) return;
    curr.css(transformPropName, '');
    curr.removeAttr('data-transform');
    updateSel('');
}
function rotationHandler(evt, offset){
    var half_width = (curr.width()/2), half_height = (curr.height()/2);
    var center_x = (offset.left) + half_width, center_y = (offset.top) + half_height;
    var mouse_x = evt.pageX; var mouse_y = evt.pageY;
    var dist_x = mouse_x - center_x, dist_y = mouse_y - center_y;
    var radians = Math.atan2(dist_x, dist_y);
    var degree = Math.floor(radians * (180 / Math.PI) * -1) + 135;
    //$('#output').html('dist_x: ' + dist_x + '<br/>dist_y: ' + dist_y);
    curr.transform({
        rotate: degree + 'deg'
    },{
        preserve: true //keeps the previous transform settings
    });
    //updateDistanceFromRBOrigin();
}
function skewHandler(evt, offset, skewDir){
    var half_width = (curr.width()/2), half_height = (curr.height()/2);
    var center_x = (offset.left) + half_width, center_y = (offset.top) + half_height;
    var mouse_x = evt.pageX; var mouse_y = evt.pageY;
    var dist_x, dist_y, direction, radians;
    if (skewDir == 'skewX'){
        dist_x = mouse_x - center_x;
        direction = -1;
        dist_y = half_height * 2 * direction;
        radians = Math.atan2(dist_x, dist_y);
    } else if (skewDir == 'skewY'){
        direction = 1;
        dist_x = half_width * 2 * direction;
        dist_y = mouse_y - center_y;
        radians = Math.atan2(dist_y, dist_x);
    } else {
        return;
    }
    //$('#output').html('dist_y: ' + dist_y + '<br/>center_y: ' + center_y + '<br/>dir: ' + direction);
    var degree = Math.floor(radians * (180 / Math.PI));
    if (skewDir == 'skewX'){
        curr.transform({skewX: degree+'deg'},{preserve: true});
    } else if (skewDir == 'skewY'){
        curr.transform({skewY: degree+'deg'},{preserve: true});
    }
}
function removeCurr(){
    if (curr != null){
        updateCurrPos();
        $.each(['width', 'height'], function(index, value) {
            var field = $('input[name="'+value+'"].adjuster');
            if (curr != null){
                curr.css(value, field.val());
            }
        });
        curr.draggable('destroy');
        curr.resizable('destroy');
        //curr.removeAttr('data-transform');
        $('#rotation-handle').remove();
        $('#skewx-handle').remove();
        $('#skewy-handle').remove();
        clearFancyFields();
        curr = null;
        var sel = $('#selector');
        sel.attr('style', '');
        sel.hide();
        $('#container').after(sel);
    }
}
function switchUI(){
    if (mode == "gui"){
        setUI("text");
    } else if (mode == "text"){
        setUI("gui");
    }
}
function enablePosFields(f){
    var posFields = $('#pos-adjuster');
    var target = posFields.find('input[name='+f+']')
    //target.removeAttr('disabled');//.show();
    target.addClass('active').removeClass('inactive');
    target.prev('.label').show();
    target.show();
}
function disablePosFields(f){
    var posFields = $('#pos-adjuster');
    var target = posFields.find('input[name='+f+']');
    //target.attr('disabled', 'disabled');//.hide();
    target.addClass('inactive').removeClass('active');
    target.prev('.label').hide();
    target.hide();
}
function updatePosFields(){
    var cvOrigin = $('input[name=origin]:checked').val();
    switch (cvOrigin){
        case 'tl':
            enablePosFields('top'); enablePosFields('left');
            disablePosFields('bottom'); disablePosFields('right');
            break;
        case 'tr':
            enablePosFields('top'); enablePosFields('right');
            disablePosFields('bottom'); disablePosFields('left');
            break;
        case 'bl':
            enablePosFields('bottom'); enablePosFields('left');
            disablePosFields('top'); disablePosFields('right');
            break;
        case 'br':
            enablePosFields('bottom'); enablePosFields('right');
            disablePosFields('top'); disablePosFields('left');
            break;
    }
    updateDistanceFromRBOrigin();
    //updateCurrPos();
}
function selectCanvasOrigin(){
    if (curr == null) return;
    d = curr;
    var top = d[0].style.top.replace('px', '');
    var bottom = d[0].style.bottom.replace('px', '');
    var left = d[0].style.left.replace('px', '');
    var right = d[0].style.right.replace('px', '');
    var a, b;
    if (top !== ''){
        a = 't';
    } else if (bottom !== ''){
        a = 'b';
    } else {
        a = 't';
    }
    if (left !== ''){
        b = 'l';
    } else if (right !== ''){
        b = 'r';
    } else {
        b = 'l';
    }
    $('input:radio[value='+a+b+']').prop('checked', 'true');
}
function updateCurrPos(){
    $.each(['top', 'bottom', 'left', 'right'], function(index, value) { 
        var field = $('input[name="'+value+'"].adjuster');
        if (curr != null && field.hasClass('active')){
            var val = field.val();
            curr.css(value, val);
        } else {
            curr.css(value, '');
        }
    });
}
function updateDistanceFromRBOrigin(){
    // for Chrome
    if (getVendorPrefix() != '-webkit-') return;
    if (curr == null) return;
    d = curr;
    var offset = getViewOffset(d[0]);
    //$('#output').html(offset.top + ' ' +offset.left);
    var dparent = d.parent(),
        dpoffset = getViewOffset(dparent[0]);
        
    var absRight = (dpoffset.left + dparent[0].clientWidth) - (offset.left + curr.outerWidth()),
        absBottom = (dpoffset.top + dparent[0].clientHeight) - (offset.top + curr.outerHeight()),
        absLeft = - dpoffset.left + offset.left,
        absTop = - dpoffset.top + offset.top;
        
    var rightPos = absRight + 'px',
        topPos = absTop + 'px',
        leftPos = absLeft + 'px',
        bottomPos = absBottom + 'px';
    /*
    var rightPos = (relRight != null) ? relRight : absRight,
        bottomPos = (relBottom != null) ? relBottom : absBottom,
        leftPos = (relLeft != null) ? relLeft : absLeft,
        topPos = (relTop != null) ? relTop : absTop;
    */
    var top = d[0].style.top.replace('px', ''),
        bottom = d[0].style.bottom.replace('px', ''),
        left = d[0].style.left.replace('px', ''),
        right = d[0].style.right.replace('px', '');
        
    var cvOrigin = $('input[name=origin]:checked').val();
        
    if (right === '' || new RegExp(/r/).test(cvOrigin)) $('input[name="right"].adjuster').val(rightPos);
    if (bottom === '' || new RegExp(/b/).test(cvOrigin)) $('input[name="bottom"].adjuster').val(bottomPos);
    if (left === '') $('input[name="left"].adjuster').val(leftPos);
    if (top === '') $('input[name="top"].adjuster').val(topPos);
}
function recalcRelPos(){
    if (curr == null) return;
    d = curr;
    $('input.adjuster.pos').each(function(){
        var prop = $(this).attr('name');
        var rel = d.attr('data-rel-'+prop),
            p = d.parent();
        if (rel != null){
            var offset = getViewOffset(d[0]);
            var dparent = d.parent(),
                dpoffset = getViewOffset(dparent[0]);
            var val;
            switch (prop){
                case 'top':
                    val = - dpoffset.top + offset.top;
                    break;
                case 'left':
                    val = - dpoffset.left + offset.left;
                    break;
                case 'right':
                    val = (dpoffset.left + dparent[0].clientWidth) - (offset.left + curr.outerWidth());
                    break;
                case 'bottom':
                    val = (dpoffset.top + dparent[0].clientHeight) - (offset.top + curr.outerHeight());
                    break;
            }
            var dimension = (prop == 'top' || prop == 'bottom') ? p.height() : p.width();
            var perc = Math.round(val * 100 / dimension);
            var newVal = perc + '%';
            //alert(newVal);
            d.css(prop, newVal);
            d.attr('data-rel-'+prop, newVal);
            $(this).val(newVal);
        }
    });
}
function updateFancyFields(){
    if (curr == null) return;
    d = curr;
    $('input.adjuster').each(function(){
        var prop = $(this).attr('name');
        if (prop == 'id'){
            $(this).val(d.attr('id'));
        } else {
            var rel = d.attr('data-rel-'+prop);
            if (rel != null){
                $(this).val(rel);
            } else {
                $(this).val(d.css(prop));
            }
        }
    });
    updateDistanceFromRBOrigin();
    recalcRelPos();
    updateBasicColorFields(d);
}
function updateBasicColorFields(d){
    var borderColorPicker = $('#color-adjuster input[name="border-color"]');
    var widthInput = $('#color-adjuster input[name="border-width"]');
    var styleSelect = $('#color-adjuster select[name="border-style"]');
    var borderSelect = $('#color-adjuster select[name="border-selection"]');
    var bgColorPicker = $('#color-adjuster input[name="background-color"]');
    var border = borderSelect.val();
    var width = d.css(border + '-width')
    var style = d.css(border + '-style');
    widthInput.val(width);
    styleSelect.val(style);
    $('#color-adjuster input.color').each(function(){
        var prop = '';
        if (this.id == borderColorPicker.attr('id')){
            prop = border + '-color';
            if (style != 'none' && width != '0px'){
                this.color.fromString(getHexBackgroundColor(d.css(prop)));
            } else {
                this.color.fromString('');
            }
        } else {
            prop = $(this).attr('name');
            this.color.fromString(getHexBackgroundColor(d.css(prop)));
        }
    });
}
function updateSelBasicColors(e){
    if (curr == null) return;
    d = curr;
    var borderColorPicker = $('#color-adjuster input[name="border-color"]');
    var widthInput = $('#color-adjuster input[name="border-width"]');
    var styleSelect = $('#color-adjuster select[name="border-style"]');
    var borderSelect = $('#color-adjuster select[name="border-selection"]');
    var color = borderColorPicker.val();
    var width = widthInput.val();
    var style = styleSelect.val();
    var border = borderSelect.val();
    if ($('#color-adjuster input[name="all-borders"]:checked').length > 0){
        border = 'border';
    }
    if (e != null){
        if (e.target.id == borderColorPicker.attr('id')){
            if (width == '' || width == '0' || width == '0px'){
                width = '1px';
                widthInput.val(width);
            }
            if (style == 'none'){
                style = 'solid';
                styleSelect.val(style);
            }
        }
    }
    d.css(border, '#' + color + ' ' + width + ' ' + style);
    var bgColor = $('#color-adjuster input[name="background-color"]').val();
    d.css('background-color', '#' + bgColor);
    updateSel('');
}
function getHexBackgroundColor(rgb){
    if (!rgb)
        return '#FFFFFF'; //default color
    var hex_rgb = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/); 
    if (hex_rgb) {
        function hex(x) {return ("0" + parseInt(x).toString(16)).slice(-2);}
        return "#" + hex(hex_rgb[1]) + hex(hex_rgb[2]) + hex(hex_rgb[3]);
    } else {
        return rgb;
    }
}
function getViewOffset(node) {
    var x = 0, y = 0, win = node.ownerDocument.defaultView || window;
    if (node) addOffset(node);
    return { left: x, top: y };
    
    function getStyle(node) {
        return node.currentStyle || // IE
            win.getComputedStyle(node, '');
    }
    
    function addOffset(node) {
        var p = node.offsetParent, style, X, Y;
        x += parseInt(node.offsetLeft, 10) || 0;
            y += parseInt(node.offsetTop, 10) || 0;
        
        if (p) {
            x -= parseInt(p.scrollLeft, 10) || 0;
            y -= parseInt(p.scrollTop, 10) || 0;
            
            if (p.nodeType == 1) {
                var parentStyle = getStyle(p)
                , localName   = p.localName
                , parent      = node.parentNode;
                if (parentStyle.position != 'static') {
                    x += parseInt(parentStyle.borderLeftWidth, 10) || 0;
                    y += parseInt(parentStyle.borderTopWidth, 10) || 0;
                    
                    if (localName == 'TABLE') {
                        x += parseInt(parentStyle.paddingLeft, 10) || 0;
                        y += parseInt(parentStyle.paddingTop, 10) || 0;
                    }
                    else if (localName == 'BODY') {
                        style = getStyle(node);
                        x += parseInt(style.marginLeft, 10) || 0;
                        y += parseInt(style.marginTop, 10) || 0;
                    }
                }
                else if (localName == 'BODY') {
                    x += parseInt(parentStyle.borderLeftWidth, 10) || 0;
                    y += parseInt(parentStyle.borderTopWidth, 10) || 0;
                }
                
                while (p != parent) {
                    x -= parseInt(parent.scrollLeft, 10) || 0;
                    y -= parseInt(parent.scrollTop, 10) || 0;
                    parent = parent.parentNode;
                }
            addOffset(p);
            }
        }
        else {
            if (node.localName == 'BODY') {
                style = getStyle(node);
                x += parseInt(style.borderLeftWidth, 10) || 0;
                y += parseInt(style.borderTopWidth, 10) || 0;
                
                var htmlStyle = getStyle(node.parentNode);
                x -= parseInt(htmlStyle.paddingLeft, 10) || 0;
                y -= parseInt(htmlStyle.paddingTop, 10) || 0;
            }
            
            if ((X = node.scrollLeft)) x += parseInt(X, 10) || 0;
            if ((Y = node.scrollTop))  y += parseInt(Y, 10) || 0;
        }
    }
}