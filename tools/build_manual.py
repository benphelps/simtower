"""Build the authored, static browser manual. No source PDF is modified.

Only the Markdown subset used by our source is accepted. Local links and
illustrations are reviewed explicitly; no document scripts are executed.
"""
from pathlib import Path
import html, re, json

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'research/manual/modern-manual.md'
OUTPUT=ROOT/'public/assets/manual/index.html'

def inline(text):
    text=html.escape(text)
    text=re.sub(r'\*\*([^*]+)\*\*',r'<strong>\1</strong>',text)
    return re.sub(r'\*([^*]+)\*',r'<em>\1</em>',text)

def build():
    body=[];nav=[];section=False;listing=None;paragraph=[];table=[];quote=[];figures=[]
    def flush():
        nonlocal listing
        if paragraph:body.append('<p>'+inline(' '.join(paragraph))+'</p>');paragraph.clear()
        if table:
            rows=[[inline(cell.strip()) for cell in row.strip('|').split('|')] for row in table]
            body.append('<div class="table-scroll" tabindex="0"><table><thead><tr>'+''.join('<th scope="col">'+c+'</th>' for c in rows[0])+'</tr></thead><tbody>'+''.join('<tr>'+''.join('<td>'+c+'</td>' for c in row)+'</tr>' for row in rows[2:])+'</tbody></table></div>');table.clear()
        if quote:body.append('<aside class="manual-note">'+inline(' '.join(quote))+'</aside>');quote.clear()
        if listing:body.append(f'</{listing}>');listing=None
    for line in SOURCE.read_text().splitlines():
        if not line.strip():flush();continue
        heading=re.fullmatch(r'(#{1,3}) (.*?)(?: \{#([^}]+)\})?',line)
        if heading:
            flush();level=len(heading[1]);title=heading[2];key=heading[3] or 'overview'
            if section:body.append('</section>')
            body.append(f'<section class="manual-section" data-title="{html.escape(title)}" data-level="{level}" aria-labelledby="{key}"><h{level} id="{key}" tabindex="-1">{inline(title)}</h{level}>');section=True
            if level>1:nav.append({'id':key,'title':title,'level':level})
            continue
        image=re.fullmatch(r'!\[(.*?)\]\((\S+) "(.*)"\)',line)
        if image:
            flush();alt,url,caption=image.groups();figures.append({'file':url,'alt':alt,'caption':caption})
            body.append(f'<figure><a href="{url}" target="_blank" rel="noopener" aria-label="Open full-size illustration: {html.escape(alt)}"><img loading="lazy" src="{url}" alt="{html.escape(alt)}"></a><figcaption>{inline(caption)}</figcaption></figure>');continue
        if line.startswith('|'):table.append(line);continue
        if line.startswith('> '):quote.append(line[2:]);continue
        item=re.fullmatch(r'(?:(\d+)\.|-) (.*)',line)
        if item:
            kind='ol' if item[1] else 'ul'
            if listing!=kind:
                flush();body.append(f'<{kind}>');listing=kind
            body.append('<li>'+inline(item[2])+'</li>');continue
        paragraph.append(line)
    flush()
    if section:body.append('</section>')
    toc=''.join(f'<li class="level-{t["level"]}"><a href="#{t["id"]}">{html.escape(t["title"])}</a></li>' for t in nav)
    OUTPUT.parent.mkdir(parents=True,exist_ok=True)
    OUTPUT.write_text('''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#173e3c"><meta name="description" content="The modern SimTower user manual: construction, elevators, tenants, services, finance and special events, illustrated with the current game's original artwork."><title>SimTower - User Manual</title><link rel="stylesheet" href="/assets/manual/manual.css"></head><body><a class="skip" href="#manual-content">Skip to manual</a><header class="manual-header"><a class="brand" href="#overview"><span>SimTower Help</span></a><a class="return-game" href="/">Return to game</a></header><div class="help-toolbar" role="toolbar" aria-label="Help navigation"><button id="manual-nav-toggle" type="button" aria-controls="manual-sidebar" aria-expanded="false">Contents</button><button id="manual-index-toggle" type="button">Index</button><button id="manual-search-toggle" type="button">Search</button><button id="manual-back" type="button" disabled>Back</button><button id="manual-history-button" type="button">History</button><button id="manual-previous" type="button" aria-label="Previous topic">&lt;&lt;</button><button id="manual-next" type="button" aria-label="Next topic">&gt;&gt;</button><button id="manual-print" type="button">Print</button></div><div class="manual-layout"><aside id="manual-sidebar"><label for="manual-search">Search the manual</label><input id="manual-search" type="search" placeholder="Try waiting floors or parking" autocomplete="off"><p class="search-tip">Press / to search. Escape clears.</p><div id="manual-results" role="status" aria-live="polite" hidden></div><nav aria-label="Manual contents"><p class="nav-title">Contents</p><ol>'''+toc+'''</ol></nav><details><summary>Keyword index</summary><div id="manual-index"></div></details><p class="edition">Browser help edition<br>Based on the 1994 user's manual</p></aside><main id="manual-content">'''+''.join(body)+'''<footer class="manual-footer"><p>Original SimTower artwork and sounds: the supplied game resources. Documentation illustrations: captures of the browser port. Text adapted from the supplied user's manual, with release differences identified.</p><a href="#overview">Back to top</a></footer></main></div><dialog id="manual-history"><div class="history-title">History</div><div id="history-topics"></div><button id="history-close" type="button">Close</button></dialog><script type="module" src="/src/manual-viewer.js"></script></body></html>''')
    (OUTPUT.parent/'illustrations.json').write_text(json.dumps(figures,indent=2)+'\n')
    print(f'Built {OUTPUT.relative_to(ROOT)}: {len(nav)} navigation entries, {len(figures)} illustrations.')

if __name__=='__main__':build()
