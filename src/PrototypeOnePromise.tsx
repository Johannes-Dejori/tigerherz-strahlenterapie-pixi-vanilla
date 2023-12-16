import { useEffect, useRef } from "react";
import { Application, Sprite, Texture } from "pixi.js";
import crosshair from "./assets/crosshair.png";
import gif from "./assets/test.gif";
import { AnimatedGIF } from "@pixi/gif";

// UUID Import
//import { v4 as uuidv4 } from "uuid";

/** Strahlenterapie Interaktion Prototype
 * @author: Johannes Dejori
 * @version: 0.1
 * @returns: PixiJS Canvas with GIF Animation Cells and Crosshair in div #interaktion
 * 
 * @todo: Implement Pixis Loader
 * @todo: Implement responsive crosshair
 * @todo: fetchPromise maybe in useLayoutEffect()?
 * 
 * @throws: Error: Renders one additional cell Gif in upper left corner
 * @throws: Error: useEffect() is called multiple times
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

    // Promise of cell GIF Animation (Only for Gifs or Json Objects)
    fetchedGifRef = useRef<AnimatedGIF>(),

    // Array of cell GIF Animations
    cellGifsRef = useRef<AnimatedGIF[]>([]),

    /** Use 'useRef' to ensure that the crosshairPosition is not updated on rerendering
     * WRONG: //[crosshairPosition, setCrosshairPosition] = useState({ x: 0, y: 0 }),
     */
    crosshairPosition = useRef({ x: 0, y: 0 }),

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

    // Mounting PixiJS Application to the DOM
    document.getElementById("interaktion")?.appendChild(app.current.view);
    console.log("PixiJS Application mounted");

    /** Fetches Asynchron Promis for cell Gif and stores the Promise in fetchPromiseRef
     *  This is only needed for GIFs and Json Obects
     */
    fetch(gif)
      .then(res => res.arrayBuffer())
      .then(AnimatedGIF.fromBuffer)
      .then((res) => {
        console.log("GIF Animation Promise fetched")
        fetchedGifRef.current = res; // Stores the fetched GIF Animation

        // Fill cellGifsRef Array with fetched GIF Animation to manipulate each
        for(let i = 0; i < props.cells; i++) {
          cellGifsRef.current.push(fetchedGifRef.current)
        }
        
        console.log("cellGifsRef filled")
        console.log(cellGifsRef.current)

        // Setup GIF Animation Cell Properties and add them to the stage
        cellGifsRef.current.forEach((cellGif) => {

          cellGif.width = 100;
          cellGif.height = 100;
          cellGif.scale.set(0.2);
          cellGif.eventMode = 'dynamic'

          cellGif.on("pointerdown", handleMouseDown);
          cellGif.on("pointerup", handleMouseUp);
          cellGif.on("pointerover", handleMouseOver);
          cellGif.on("pointerout", handleMouseOut);

          // Adds GIF Animation to Stage
          app.current.stage.addChild(cellGif);
        })
        console.log("cellGifsRef initialized and added to stage")

        // Creates Texture Object for crrosshair sprite (PNG)
        const crosshairTexture = Texture.from(crosshair);

        // Creates & add crosshair Sprite to Stage
        const crosshairSprite = new Sprite(crosshairTexture);
        app.current.stage.addChild(crosshairSprite);
        crosshairSprite.scale.set(0.15);

        // Pixi.js Render Loop
        console.log("PixiJS Render Loop started")
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
        console.log("PixiJS Render Loop stopped")
      }).catch(error => {
        console.error('Fehler beim Laden der Daten:', error); // Errorhandling
      });

    return () => {
      // Cleanup
      document.getElementById("interaktion")?.removeChild(app.current.view);
      console.log("PixiJS Application unmounted");
    };
  }, []);

  //HTML
  return (
    <div id="interaktion" onMouseMove={handleMouseMove}></div>
  );
}
