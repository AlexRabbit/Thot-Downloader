// ==UserScript==
// @name         Thot Downloader
// @author       ThotDev, DumbCodeGenerator, AlexRabbit
// @description  Download galleries from Forums & Sites
// @version      2023
// @icon         https://i.imgur.com/5xpgAny.jpg
// @license      GPL3; https://www.gnu.org/licenses/gpl-3.0.en.html
// @match        https://lewdweb.net/*
// @match        https://forum.lewdweb.net/*
// @match        https://simpcity.su/*
// @match        https://forum.simpcity.su/*
// @match        https://forum.thotbook.tv/*
// @match        https://thotbook.tv/*
// @match        https://forum.thots.tv/*
// @match        https://forum.thots.tv/*
// @match        https://lewdweb.net/*
// @match        https://kitty-kats.net/*
// @require      https://code.jquery.com/jquery-3.3.1.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/jszip/3.1.5/jszip.min.js
// @require      https://unpkg.com/file-saver@2.0.1/dist/FileSaver.min.js
// @require      https://greasemonkey.github.io/gm4-polyfill/gm4-polyfill.js?v=a834d46
// @noframes
// @connect      self
// @connect      forum.sexy-egirls.com
// @connect      yiff.party
// @connect      cyberdrop.me
// @connect      cyberdrop.cc
// @connect      cyberdrop.nl
// @connect      sendvid.com
// @connect      share.dmca.gripe
// @connect      zz.ht
// @connect      gofile.io
// @run-at       document-start
// @grant        GM.xmlHttpRequest
// @grant        GM_xmlhttpRequest
// @grant        GM_download
// ==/UserScript==


function copyStringToClipboard (str) {
    if (Array.isArray(str))
    {
        str = str.join('\r\n');
    }

    // Create new element
    var el = document.createElement('textarea');
    // Set value (string to be copied)
    el.value = str;
    // Set non-editable to avoid focus and move outside of view
    el.setAttribute('readonly', '');
    el.style = {position: 'absolute', left: '-9999px'};
    document.body.appendChild(el);
    // Select text inside element
    el.select();
    // Copy text to clipboard
    document.execCommand('copy');
    // Remove temporary element
    document.body.removeChild(el);
}

/**
 * Gallery type 1: Mace Gallery
 */
function addCopyButtonMaceGallery()
{
    const headerTitle = document.querySelector('.g1-gallery-title');
    const frames = Array.from(document.querySelectorAll('.g1-gallery-frame'));
    const urls = frames.map((x) => {
        return x.dataset.g1ShareImage;
    });

    const button = document.createElement('button');
    button.appendChild(document.createTextNode('Copy direct image URLs (list)'));

    button.addEventListener('click', function() {
        copyStringToClipboard(urls);
    }, false);

    headerTitle.insertAdjacentElement('afterend', button);
}

/**
 * Gallery type 2: Gallery Items (class name: `.gallery-item`)
 */
function addCopyButtonGalleryItems(galleryItems)
{
    const entryTitle = document.querySelector('.entry-title');
    const items = Array.from(galleryItems);
    const imageUrls = [];

    for (const item of items)
    {
        const image = item.querySelector('img');
        const url = image.src;

        imageUrls.push(url);
    }

    const button = document.createElement('button');
    button.appendChild(document.createTextNode('Copy direct image URLs (list)'));

    button.addEventListener('click', function() {
        copyStringToClipboard(imageUrls);
    }, false);

    entryTitle.insertAdjacentElement('beforeend', button);
}

/**
 * Type 1
 */
const teaser = document.querySelector('.mace-gallery-teaser');
if (teaser) {
    teaser.addEventListener('click', function() {
        // Short delay so the gallery can properly load.
        setTimeout(function() {
            addCopyButtonMaceGallery();
        }, 1500);
    });
}

/**
 * Type 2
 */
const galleryItems = document.querySelectorAll('.gallery-item');
if (galleryItems.length > 0)
{
    addCopyButtonGalleryItems(galleryItems);
}

//COPYGALLERY TO CLIPBOARD


//Set to 'true', if you wanna select text on page as name for the zip.
//If 'false' – name for the zip will be generated automatically(default is 'thread name/post number.zip')
var useSelect = false;

//Set to 'true', if you wanna see a confirmation box before every download.
//Works only if 'useSelect' setted to 'true'
//If you press 'OK' – you need to select text as name for the zip(you can click on text or select part of it)
//If you press 'Cancel' – name for the zip will be generated automatically(default is 'thread name/post number.zip')
//If this setted to 'false' = you pressed 'OK' ^
var needConfirm = false;

//If 'true' – trying to get video links from iframes(like sendvid as example)
//Tested only with sendvid for now
//Can be very slow, because the script will need to send a separate request for every iframe(CORS is a pain)
var getIFrames = true;

/* globals jQuery JSZip saveAs */

function download(post, fileName){
    var $text = $(post).children('a');
    var threadTitle = $('.p-title-value').clone()
                                .children()
                                .remove()
                                .end()
                                .text()
                                .replaceAll(/\\|\//gi,'_')
                                .trim();

    var postNumber = $(post).parent().find('li:last-child > a').text().trim();

    var urls = $(post)
    .parents('.message-main')
    .first()
    .find('.js-lbImage,.attachment-icon a,.lbContainer-zoomer,video' + (getIFrames ? ',iframe' : ''))
    .map(function () {
        let link;
        if($(this).is('iframe')){
            link = $(this).data('link');
        }else if($(this).has('source').length){
            link = $(this).children('source').first().attr('src');
        }else{
            link = $(this).is('[href]') ? $(this).attr('href') : $(this).data('src');
        }
        return link;
    })
    .get();

    var zip = new JSZip(),
        current = 0,
        total = urls.length;

    $text.text('Downloading...');

    function next () {
        if (current < total) {
            const dataText = `Downloading ${current+1}/${total} (%percent%)`
            $text.text(dataText.replace('%percent', 0));

            GM.xmlHttpRequest({
                method: 'GET',
                url: urls[current++],
                responseType: 'arraybuffer',
                onprogress: function(evt){
                    var percentComplete = (evt.loaded / evt.total) * 100;
                    $text.text(dataText.replace('%percent', percentComplete.toFixed(0)));
                },
                onload: function (response) {
                    const isCyberdrop = response.finalUrl.includes('cyberdrop.me') || response.finalUrl.includes('cyberdrop.cc') || response.finalUrl.includes('cyberdrop.nl');
                    try {
                        var data = response.response;
                        var name = response.responseHeaders.match(/^content-disposition.+(?:filename=)(.+)$/mi)[1].replace(/\"/g, '');
                    }
                    catch (err) {
                        name = new URL(response.finalUrl).pathname.split('/').pop(); //response.finalUrl.split('/').pop().split('?')[0];
                    }finally{
                        name = decodeURIComponent(name);

                        //Removing cyberdrop's ID from the filename
                        if(isCyberdrop){
                            const ext = name.split('.').pop();
                            name = name.replaceAll(/-[^-]+$|\.[A-Z0-9]{2,4}(?=-)/gi, '') + '.' + ext;
                        }

                        zip.file(name, data);
                    }

                    next();
                },
                onerror: function (response) {
                    next();
                }
            });
        }
        else {
            $text.text('Generating zip...');
            zip.generateAsync({ type: 'blob' })
                .then(function (blob) {
                $text.text('Download complete!');

                if(!GM_download){
                    if(!fileName || fileName.length === 0)
                        fileName = postNumber + ' - ' + threadTitle;
                    saveAs(blob, `${fileName}.zip`);
                }else{
                    if(!fileName || fileName.length === 0)
                        fileName = postNumber;
                    var url = URL.createObjectURL(blob);
                    GM_download({url: url, name: `${threadTitle}/${fileName}.zip`,
                                 onload: function(){
                                     URL.revokeObjectURL(url);
                                     blob = null;
                                 }});
                }
            });

        }
    }
    next();
}

function selectName(post, callback){
    if(useSelect && (!needConfirm || confirm('Select name for the zip?'))){
        $(document).on('mouseup', function(e){
            e.preventDefault();

            function getSelectionText() {
                var text = "";
                var activeEl = document.activeElement;
                var activeElTagName = activeEl ? activeEl.tagName.toLowerCase() : null;
                if (
                    (activeElTagName == "textarea") || (activeElTagName == "input" &&
                                                        /^(?:text|search|password|tel|url)$/i.test(activeEl.type)) &&
                    (typeof activeEl.selectionStart == "number")
                ) {
                    text = activeEl.value.slice(activeEl.selectionStart, activeEl.selectionEnd);
                } else if (window.getSelection) {
                    text = window.getSelection().toString();
                }
                return text;
            }

            var zipName = getSelectionText().trim();

            if(zipName.length === 0){
                var x = e.clientX, y = e.clientY,
                    elementMouseIsOver = document.elementFromPoint(x, y);
                zipName = elementMouseIsOver.innerText.trim();
            }

            $(document).off('mouseup');
            callback(post, zipName);
        });
    }else{
        callback(post, null);
    }
}

jQuery(function ($) {
    if(getIFrames){
        $('div.message-main iframe').each(function(){
            const $this = $(this);
            const embed = $(this).data('s9e-mediaembed-src');
            if(!embed) return;

            GM.xmlHttpRequest({
                method: 'GET',
                url: embed,
                onload: function(res){
                    let link;
                    const video = $(res.responseText).filter('video').first();
                    if(video.has('source').length){
                        link = video.children('source').first().attr('src');
                    }else{
                        link = video.is('[src]') ? video.attr('src') : video.data('src');
                    }
                    $this.data('link', link);
                }
            });
        });
    }

    $('.message-attribution-opposite')
        .map(function () { return $(this).children('li:first'); })
        .each(function () {
        var downloadLink = $('<li><a href="#">⬇ Download</a><li>');
        var $text = downloadLink.children('a');
        downloadLink.insertBefore($(this));
        downloadLink.click(function(e){
            e.preventDefault();
            selectName(this, download);
        });
    }
             );
});
