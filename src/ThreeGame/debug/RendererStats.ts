//  credit to https://github.com/jeromeetienne/threex.rendererstats/blob/master/threex.rendererstats.js

import { WebGLRenderer } from 'three';

export type RendererStatsObject = {
    domElement: HTMLElement;
    update: (renderer: WebGLRenderer) => void;
    dispose: () => void;
};

/**
 * provide info on THREE.WebGLRenderer
 *
 * @param {Object} renderer the renderer to update
 * @param {Object} Camera the camera to update
 */
export const RendererStats = function (style: Record<string, any> = { position: 'absolute', left: '0px', top: '0px' }) {
    // var msMin = 100;
    // var msMax = 0;
    const scale = 2.5;

    var container = document.createElement(`div`);
    container.style.cssText = `width:${scale * 80}px;opacity:0.9;cursor:pointer`;

    for (const k of Object.keys(style)) {
        // @ts-ignore
        container.style[k] = style[k];
    }

    var msDiv = document.createElement(`div`);
    msDiv.style.cssText = `padding:0 0 ${scale * 3}px ${scale * 3}px;text-align:left;background-color:#200;`;
    container.appendChild(msDiv);

    var msText = document.createElement(`div`);
    msText.style.cssText = `color:#f00;font-family:Helvetica,Arial,sans-serif;font-size:${
        scale * 9
    }px;font-weight:bold;line-height:${scale * 15}px`;
    msText.innerHTML = `WebGLRenderer`;
    msDiv.appendChild(msText);

    var msTexts: HTMLElement[] = [];
    var nLines = 9;
    for (var i = 0; i < nLines; i++) {
        msTexts[i] = document.createElement(`div`);
        msTexts[i].style.cssText = `color:#f00;background-color:#311;font-family:Helvetica,Arial,sans-serif;font-size:${
            scale * 9
        }px;font-weight:bold;line-height:${scale * 15}px`;
        msDiv.appendChild(msTexts[i]);
        msTexts[i].innerHTML = '-';
    }

    document.body.appendChild(container);

    var lastTime = Date.now();
    return {
        domElement: container,

        update: function (webGLRenderer: WebGLRenderer) {
            // refresh only 30time per second
            if (Date.now() - lastTime < 1000 / 30) return;
            lastTime = Date.now();

            var i = 0;
            msTexts[i++].textContent = '== Memory =====';
            msTexts[i++].textContent = 'Programs: ' + webGLRenderer.info.programs?.map(({ name }) => name);
            msTexts[i++].textContent = 'Geometries: ' + webGLRenderer.info.memory.geometries;
            msTexts[i++].textContent = 'Textures: ' + webGLRenderer.info.memory.textures;

            msTexts[i++].textContent = '== Render =====';
            msTexts[i++].textContent = 'Frame: ' + webGLRenderer.info.render.frame;
            msTexts[i++].textContent = 'Calls: ' + webGLRenderer.info.render.calls;
            msTexts[i++].textContent = 'Triangles: ' + webGLRenderer.info.render.triangles;
            msTexts[i++].textContent = 'Points: ' + webGLRenderer.info.render.points;
        },

        dispose: function () {
            // container.parentElement.remove(container);
        },
    };
};
