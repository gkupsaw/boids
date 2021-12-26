import { Vector3 } from 'three';

type BoidInfo = {
    id: number;
    p: Vector3;
    v: Vector3;
    forces: { name: string; val: Vector3 }[];
    avgForces: { [name: string]: Vector3 };
};

export type BoidStatsObject = {
    domElement: HTMLElement;
    update: (boid: BoidInfo) => void;
    dispose: () => void;
};

/**
 * provide info on THREE.WebGLRenderer
 *
 * @param {Object} renderer the renderer to update
 * @param {Object} Camera the camera to update
 */
export const BoidStats = function (style: Record<string, any> = { position: 'absolute', left: '0px', top: '0px' }) {
    // var msMin = 100;
    // var msMax = 0;
    const scale = 2.5;

    var container = document.createElement(`div`);
    container.style.cssText = `width:${scale * 130}px;opacity:0.9;cursor:pointer`;

    for (const k of Object.keys(style)) {
        // @ts-ignore
        container.style[k] = style[k];
    }

    document.body.appendChild(container);

    let msDiv: any = null;
    var lastTime = Date.now();
    return {
        domElement: container,

        update: function (boid: BoidInfo) {
            // refresh only 30time per second
            if (Date.now() - lastTime < 1000 / 30) return;
            lastTime = Date.now();

            if (msDiv) container.removeChild(msDiv);

            msDiv = document.createElement(`div`);
            msDiv.style.cssText = `padding:0 0 ${scale * 3}px ${scale * 3}px;text-align:left;background-color:#200;`;
            container.appendChild(msDiv);

            var msText = document.createElement(`div`);
            msText.style.cssText = `color:#f00;font-family:Helvetica,Arial,sans-serif;font-size:${
                scale * 9
            }px;font-weight:bold;line-height:${scale * 15}px`;
            msText.innerHTML = `Boid State`;
            msDiv.appendChild(msText);

            const lines = [
                '== Basic ===============',
                'ID: ' + boid.id,
                'Position: ' + boid.p.toArray().map((n) => n.toFixed(2)),
                'Velocity: ' + boid.v.toArray().map((n) => n.toFixed(2)),
                '== Forces ==============',
                ...boid.forces.map((f) => f.name + ': ' + f.val.toArray().map((n) => n.toFixed(2))),
                '== Group Forces ========',
                ...Object.keys(boid.avgForces).map(
                    (name) => name + ': ' + boid.avgForces[name].toArray().map((n) => n.toFixed(2))
                ),
            ];

            var msTexts: HTMLElement[] = [];
            for (let i = 0; i < lines.length; i++) {
                msTexts[i] = document.createElement(`div`);
                msTexts[
                    i
                ].style.cssText = `color:#f00;background-color:#311;font-family:Helvetica,Arial,sans-serif;font-size:${
                    scale * 9
                }px;font-weight:bold;line-height:${scale * 15}px`;
                msDiv.appendChild(msTexts[i]);
                msTexts[i].innerHTML = lines[i];
            }
        },

        dispose: function () {
            // container.parentElement.remove(container);
        },
    };
};
