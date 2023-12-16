import { useEffect, useRef, useState } from "react";
import { Application, Sprite, Texture } from "pixi.js";
import crosshair from "./assets/crosshair.png";
import gif from "./assets/test.gif";
import { AnimatedGIF } from "@pixi/gif";

// UUID Import
//import { v4 as uuidv4 } from "uuid";

/** Strahlenterapie Interaktion Prototype
 * @author: Johannes Dejori
 * @version: 0.2
 * @returns: PixiJS Canvas with GIF Animation Cells and Crosshair in div #interaktion
 *
 * @todo: Implement responsive crosshair
 * @throws: Error: useEffect() is called twice -> Temporarily Fixed with:
 * if(app.current.stage.children.length < props.cells){
 *    app.current.stage.addChild(gifAnim);
 *  }
 */

/** Interface for the Page Propertys
 * @property cells: Amount of cells
 */
interface PageProps {
  cells: number;
}

/** Interface for the Position Propertys for cells
 * @property x: x coordinate
 * @property y: y coordinate
 * @property randomSin: Random sinus value
 */
interface PositionProps {
  x: number;
  y: number;
  randomSin: number;
}

export default function Main(props: PageProps) {
  const 
    // Utillity Function -> should be outsourced
    getRandomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min;
    },

    // Keeps track of the current scale state of the cell
    scaleState = useRef(false),

    // Keeps track of the current press state of the cell
    pressState = useRef(false),

    // Array of cell GIF Animation Promises (Only for Gifs or Json Objects)
    fetchPromisesRef = useRef<Promise<AnimatedGIF>[]>([]),

    // Array of cell GIF Animations
    cellGifsRef = useRef<AnimatedGIF[]>([]),

    /** PixiJS Vanilla JS Initialization
     * - useRef() to initialize the PixiJS Application once the component is mounted and prevent rerendering
     * - Then: use 'app.curent' to access the PixiJS Application
     * @object app: PixiJS Application
     */
    app = useRef(
      new Application<HTMLCanvasElement>({
        background: "#1099bb",
        width: 600,
        height: 600,

        // Should be fixed: https://www.html5gamedevs.com/topic/50157-pixijs6rendering-question-the-texture-becomes-blurry-as-it-shrinks/
        resolution: 1,
      })
    ),

    /** Creates an array of objects with x and y coordinates and randomSin entry for each cell
     * used for updating the position of each cell in the render loop
     * @interface PositionProps
     */
    positions = useRef<PositionProps[]>(
      Array.from({ length: props.cells }, () => ({
        x: 0,
        y: 0,
        randomSin: getRandomInRange(0, 10),
      }))
    ),

    /** Use 'useRef' to ensure that the crosshairPosition is not updated on rerendering
     * WRONG: //[crosshairPosition, setCrosshairPosition] = useState({ x: 0, y: 0 }),
     */
    crosshairPosition = useRef({ x: 0, y: 0 }),

    /** Handles mouse movement on the canvas and updates the crosshairPosition
     * (npm install @types/pixi.js)
     */
    handleMouseMove = (event: any) => {
      const interaktionElement = document.getElementById("interaktion");

      if (interaktionElement) {
        const { clientX, clientY } = event;
        const rect = interaktionElement.getBoundingClientRect();

        //Not responsive yet -> 1/2*PNG Maße müssen subrahiert werden
        const relativeX = clientX - rect.left - 88;
        const relativeY = clientY - rect.top - 108;
        //console.log("relativeX:", relativeX, "relativeY:", relativeY);
        crosshairPosition.current = { x: relativeX, y: relativeY };
      }
    },
    handleMouseDown = () => {
      pressState.current = true;
      //console.log("Mouse pressed")
    },
    handleMouseUp = () => {
      pressState.current = false;
    },
    handleMouseOver = () => {
      scaleState.current = true;
      //console.log("Mouse over")
    },
    handleMouseOut = () => {
      scaleState.current = false;
    };

  /* 
    handleCellAliveChange = (value: boolean) => {
      // Do something in the parent component when alive changes
      console.log("Cell alive value changed to:", value);
    };
  */

  // useEffect() is called after the component is mounted and on dependency changes in callback []
  useEffect(() => {
    console.log("useEffect() called");

    // Mounting PixiJS Application to the DOM
    document.getElementById("interaktion")?.appendChild(app.current.view);

    /** Fetches Asynchron Promise for each cell Gif and stores them in fetchPromisesRef Array
     *  This is only needed for GIFs and Json Obects
     */
    for (let i = 0; i < props.cells; i++) {
      const fetchPromise: Promise<AnimatedGIF> = fetch(gif)
        .then((res) => res.arrayBuffer())
        .then(AnimatedGIF.fromBuffer);

      fetchPromisesRef.current.push(fetchPromise);
    }

    /** Waits for all above Promises for further postprocessing
     * Should be replaced with Pixi.js Loader in future for better performance, error handling and fetching event data
     */
    Promise.all(fetchPromisesRef.current)
      .then((gifs) => {
        //
        gifs.forEach((gifAnim) => {
          // Setup GIF Animation Cell Properties
          gifAnim.width = 100;
          gifAnim.height = 100;
          gifAnim.scale.set(0.2);
          gifAnim.eventMode = "dynamic";

          gifAnim.on("pointerdown", handleMouseDown);
          gifAnim.on("pointerup", handleMouseUp);
          gifAnim.on("pointerover", handleMouseOver);
          gifAnim.on("pointerout", handleMouseOut);

          /** Workaorund for PixiJS/React rerendering
           * Avoids rendering one additional cell(s) Gif to the stage
           * @throws: Error: useEffect() is called multiple times
           */
          // Adds GIF Animation to Stage
          if(app.current.stage.children.length < props.cells){
            app.current.stage.addChild(gifAnim);
          }
          // Adds setuped GIF Animations to cellGifsRef Array for accessing them in render loop
          if(cellGifsRef.current.length < props.cells){
            cellGifsRef.current.push(gifAnim);
          }
        });

        console.log(cellGifsRef.current);

        // Creates Texture Object for crrosshair sprite (PNG)
        const crosshairTexture = Texture.from(crosshair);

        // Creates & add crosshair Sprite to Stage
        const crosshairSprite = new Sprite(crosshairTexture);
        app.current.stage.addChild(crosshairSprite);
        crosshairSprite.scale.set(0.15);

        // Pixi.js Render Loop
        //console.log("loop activated");
        app.current.ticker.add(() => {
          for (let i = 0; i < props.cells; i++) {
            // Updates cell position
            positions.current[i].randomSin += 0.001;

            positions.current[i].x =
              Math.sin(positions.current[i].randomSin) * 250 + 250;
            positions.current[i].y =
              Math.sin(positions.current[i].randomSin / 1.5) * 250 + 250;

            cellGifsRef.current[i].x = positions.current[i].x;
            cellGifsRef.current[i].y = positions.current[i].y;

            // Updates crosshair position
            crosshairSprite.x = crosshairPosition.current.x;
            crosshairSprite.y = crosshairPosition.current.y;

            // Triggers GIF Animation
            if (scaleState.current && pressState.current) {
              console.log("GIF Animation triggered");
            }
          }
        });
      })
      .catch((error) => {
        console.error("Fehler beim Laden der Daten:", error); // Errorhandling
      });

    return () => {
      // Cleanup
      document.getElementById("interaktion")?.removeChild(app.current.view);
    };
  }, []);

  //HTML
  return <div id="interaktion" onMouseMove={handleMouseMove}></div>;
}
