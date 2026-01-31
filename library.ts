enum NeoPixelColors {
    //% block="white"
    White = 0xAAAAAA,
    //% block="red"
    Red = 0xFF0000,
    //% block="green"
    Green = 0x00FF00,
    //% block="blue"
    Blue = 0x0000FF,
    //% block="orange"
    Orange = 0xFF3300,
    //% block="yellow"
    Yellow = 0xAA6600,
    //% block="purple"
    Purple = 0x8a2be2,
    //% block="black"
    Black = 0x000000
}

/**
 * Different modes for RGB or RGB+W NeoPixel strips
 */
enum NeoPixelMode {
    //% block="RGB (GRB format)"
    RGB = 1,
    //% block="RGB+W"
    RGBW = 2,
    //% block="RGB (RGB format)"
    RGB_RGB = 3
}


/**
 * Functions to operate NeoPixel strips.
 */
//% block="LED Strip"
//% groups=['Logic']
//% weight=7 color=#e86800 icon="\uf0a9"
namespace rb0ledstrip {

    const MAXBRIGHTNESS = 120;

    /**
     * A NeoPixel strip
     */
    class Strip {
        buf: Buffer;
        trueColors: number[];  //Always in RGB or RGBW mode

        pin: DigitalPin;
        // TODO: encode as bytes instead of 32bit
        brightness: number;
        start: number; // start offset in LED strip
        stripColor: number;
        turnedOn: boolean;
        _length: number; // number of LEDs
        _mode: NeoPixelMode;
        _matrixWidth: number; // number of leds in a matrix - if any


        initTrueColors() {
            const stride = this._mode === NeoPixelMode.RGBW ? 4 : 3;
            this.trueColors = [];
            for (let i = 0; i < stride * this._length; ++i) {
                this.trueColors.push(0);
            }
        }

        isLighted(): boolean {
            const stride = this._mode === NeoPixelMode.RGBW ? 4 : 3;
            for (let i = 0; i < stride * this._length; ++i) {
                if (this.trueColors[i] > 0) {
                    return true;
                }
            }

            return false;
        }

        /**
         * Shows all LEDs to a given color (range 0-255 for r, g, b).
         * @param rgb χρώμα RGB για τα LED
         */
        //% blockId="neopixel_set_strip_color" block="%strip|εμφάνισε %rgb=neopixel_colors χρώμα"
        //% strip.defl="ταινία led"
        //% weight=85 blockGap=8
        //% parts="neopixel"
        showColor(rgb: number) {
            this.clear();
            this.stripColor = rgb;
            if (rgb !== NeoPixelColors.Black) {
                this.turnedOn = true;
            }
            rgb = rgb >> 0;
            this.setAllRGB(rgb);
            this.show();
        }

        turnOff() {
            this.turnedOn = false;
            this.clear();
            this.show();
        }

        /**
         * Set LED to a given color (range 0-255 for r, g, b).
         * You need to call ``show`` to make the changes visible.
         * @param pixeloffset position of the NeoPixel in the strip
         * @param rgb RGB color of the LED
         */
        //% blockId="neopixel_set_pixel_color" block="%strip|άλλαξε το led %pixeloffset|σε %rgb=neopixel_colors"
        //% strip.defl="ταινία led"
        //% weight=80 blockGap=24
        //% parts="neopixel"
        setPixelColor(pixeloffset: number, rgb: number): void {
            if (rgb !== NeoPixelColors.Black) {
                this.turnedOn = true;
            }

            this.setPixelRGB(pixeloffset >> 0, rgb >> 0);
            this.show();
        }

        /**
         * Return "true" if the strip showns color is equal to "color" parameter
         * You need to call ``show`` to make the changes visible.
         * @param pixeloffset position of the NeoPixel in the strip
         * @param rgb RGB color of the LED
         */
        //% blockId="neopixel_isstripcolor" block="%strip|δείχνει %color|χρώμα"
        //% strip.defl="ταινία led"
        //% weight=35
        //% parts="neopixel"
        isStripColored(color: NeoPixelColors): boolean {
            const end = this.start + this._length;
            const stride = this._mode === NeoPixelMode.RGBW ? 4 : 3;

            let allblack = true;
            for (let i = this.start; i < end; ++i) {
                // Get the original color from trueColors buffer
                let r = this.trueColors[i * stride + 0]
                let g = this.trueColors[i * stride + 1]
                let b = this.trueColors[i * stride + 2]
                //let w = stride === 4 ? this.trueColors[i * stride + 3] : 0

                let curcolor = rgb(r, g, b);
                if (color !== NeoPixelColors.Black) {
                    allblack = false;
                    if (color !== curcolor) {
                        return false;
                    }
                }
            }

            return allblack ? false : true;
        }

        /**
        * Turn on all LEDs.
        */
        //% blockId="neopixel_turnon" block="%strip|άναψε όλα τα led"
        //% strip.defl="ταινία led"
        //% weight=88
        //% parts="neopixel"
        turnOn(): void {
            this.turnedOn = true;
            this.applyTrueColors();
        }

        /**
         * Turn off all LEDs.
         * You need to call ``show`` to make the changes visible.
         */
        //% blockId="neopixel_clear" block="%strip|σβήσε όλα τα led"
        //% strip.defl="ταινία led"
        //% weight=87
        //% parts="neopixel"
        clear(): void {
            const stride = this._mode === NeoPixelMode.RGBW ? 4 : 3;
            this.buf.fill(0, this.start * stride, this._length * stride);
            this.show();
        }

        /**
         * Send all the changes to the strip.
         */
        //% blockId="neopixel_show" block="%strip|εμφάνισε τις αλλαγές στα led" blockGap=8
        //% strip.defl="ταινία led"
        //% weight=79
        //% parts="neopixel"
        private show() {
            // only supported in beta
            // ws2812b.setBufferMode(this.pin, this._mode);
            ws2812b.sendBuffer(this.buf, this.pin);
        }

        /**
         * Gets the number of pixels declared on the strip
         */
        //% blockId="neopixel_length" block="%strip|length" blockGap=8
        //% strip.defl=strip
        //% weight=60
        private length() {
            return this._length;
        }

        applyTrueColors(): void {
            const end = this.start + this._length;
            const stride = this._mode === NeoPixelMode.RGBW ? 4 : 3;

            for (let i = this.start; i < end; ++i) {
                // Get the original color from trueColors buffer
                let r = this.trueColors[i * stride + 0]
                let g = this.trueColors[i * stride + 1]
                let b = this.trueColors[i * stride + 2]
                let w = stride === 4 ? this.trueColors[i * stride + 3] : 0

                // Apply new brightness and write to buffer
                this.setPixelRGB(i, rgb(r, g, b))  // or include W if RGBW
            }

            this.show()
        }

        /**
         * Set the brightness of the strip. This flag only applies to future operation.
         * @param brightness a measure of LED brightness in 0-255. eg: 255
         */
        //% blockId="neopixel_set_brightness" block="%strip|όρισε τη φωτεινότητα σε %brightness" blockGap=8
        //% strip.defl="ταινία led"
        //% weight=59
        //% parts="neopixel" advanced=true
        setBrightness(brightness: number): void {
            const adjustedBrightness = brightness & 0xff;;
            if (adjustedBrightness === this.brightness) {
                return;
            }

            this.brightness = adjustedBrightness;
            if (this.turnedOn) {
                this.applyTrueColors();
            }
        }

        private shiftTrueColors(offset: number): void {
            offset = offset >> 0;
            if (offset === 0) return;

            const stride = this._mode === NeoPixelMode.RGBW ? 4 : 3;
            const count = this._length;

            const tmp: number[] = [];

            // Pre-fill with black
            for (let i = 0; i < count * stride; i++) {
                tmp.push(0);
            }

            for (let i = 0; i < count; i++) {
                const srcIndex = i - offset;

                if (srcIndex < 0 || srcIndex >= count) {
                    continue; // stays black
                }

                const src = srcIndex * stride;
                const dst = i * stride;

                for (let c = 0; c < stride; c++) {
                    tmp[dst + c] = this.trueColors[src + c];
                }
            }

            // Copy back
            for (let i = 0; i < tmp.length; i++) {
                this.trueColors[i] = tmp[i];
            }
        }

        /**
         * Shift LEDs forward and clear with zeros.
         * You need to call ``show`` to make the changes visible.
         * @param offset number of pixels to shift forward, eg: 1
         */
        //% blockId="neopixel_shift" block="%strip|μετακίνησε τα χρώματα κατά %offset|led" blockGap=8
        //% strip.defl="ταινία led"
        //% weight=40
        //% parts="neopixel" advanced=true
        shift(offset: number = 1): void {
            offset = offset >> 0;
            const stride = this._mode === NeoPixelMode.RGBW ? 4 : 3;
            this.buf.shift(-offset * stride, this.start * stride, this._length * stride)
            this.shiftTrueColors(offset);
            this.show();
        }

        private rotateTrueColors(offset: number): void {
            offset = offset >> 0;
            if (offset === 0) return;

            const stride = this._mode === NeoPixelMode.RGBW ? 4 : 3;
            const count = this._length;

            // Normalize offset
            offset = ((offset % count) + count) % count;
            if (offset === 0) return;

            const tmp: number[] = [];

            // Pre-fill so indices exist
            for (let i = 0; i < count * stride; i++) {
                tmp.push(0);
            }

            for (let i = 0; i < count; i++) {
                const src = ((i - offset + count) % count) * stride;
                const dst = i * stride;

                for (let c = 0; c < stride; c++) {
                    tmp[dst + c] = this.trueColors[src + c];
                }
            }

            // Copy back
            for (let i = 0; i < tmp.length; i++) {
                this.trueColors[i] = tmp[i];
            }
        }

        /**
         * Rotate LEDs forward.
         * You need to call ``show`` to make the changes visible.
         * @param offset number of pixels to rotate forward, eg: 1
         */
        //% blockId="neopixel_rotate" block="%strip|περιέστρεψε τα χρώματα κατά %offset|led" blockGap=8
        //% strip.defl="ταινία led"
        //% weight=39
        //% parts="neopixel" advanced=true
        rotate(offset: number = 1): void {
            offset = offset >> 0;
            const stride = this._mode === NeoPixelMode.RGBW ? 4 : 3;
            this.buf.rotate(-offset * stride, this.start * stride, this._length * stride)
            this.rotateTrueColors(offset);
            this.show();
        }

        /**
         * Return "true" if the led strip is lighted
         * 
         */
        //% blockId="neopixed_strip_islighted" block="%strip|είναι αναμμένη"
        //% strip.defl="ταινία led"
        //% weight=38
        //% parts="neopixel"
        isStripTurnedOn(): boolean {
            return this.turnedOn;
        }

        /**
         * Set the pin where the neopixel is connected, defaults to P0.
         */
        //% weight=10
        //% parts="neopixel" advanced=true
        setPin(pin: DigitalPin): void {
            this.pin = pin;
            pins.digitalWritePin(this.pin, 0);
            // don't yield to avoid races on initialization
        }


        /**
         * Estimates the electrical current (mA) consumed by the current light configuration.
         */
        //% weight=9 blockId=neopixel_power block="%strip|power (mA)"
        //% strip.defl=strip
        //% advanced=true
        private power(): number {
            const stride = this._mode === NeoPixelMode.RGBW ? 4 : 3;
            const end = this.start + this._length;
            let p = 0;
            for (let i = this.start; i < end; ++i) {
                const ledoffset = i * stride;
                for (let j = 0; j < stride; ++j) {
                    p += this.buf[i + j];
                }
            }
            return Math.idiv(this.length() * 7, 10) /* 0.7mA per neopixel */
                + Math.idiv(p * 480, 10000); /* rought approximation */
        }

        private setBufferRGB(offset: number, red: number, green: number, blue: number): void {
            if (this._mode === NeoPixelMode.RGB_RGB) {
                this.buf[offset + 0] = red;
                this.buf[offset + 1] = green;
            } else {
                this.buf[offset + 0] = green;
                this.buf[offset + 1] = red;
            }
            this.buf[offset + 2] = blue;
        }

        private setTrueColorsBufferRGB(offset: number, red: number, green: number, blue: number): void {
            this.trueColors[offset + 0] = red;
            this.trueColors[offset + 1] = green;
            this.trueColors[offset + 2] = blue;
        }

        private setAllRGB(rgb: number) {
            let red = unpackR(rgb);
            let green = unpackG(rgb);
            let blue = unpackB(rgb);

            const br = this.brightness;
            const end = this.start + this._length;
            const stride = this._mode === NeoPixelMode.RGBW ? 4 : 3;

            for (let i = this.start; i < end; ++i) {
                this.setTrueColorsBufferRGB(i * stride, red, green, blue)
            }

            if (br < 255) {
                red = (red * br) >> 8;
                green = (green * br) >> 8;
                blue = (blue * br) >> 8;
            }
            for (let i = this.start; i < end; ++i) {
                this.setBufferRGB(i * stride, red, green, blue)
            }
        }
        private setAllW(white: number) {
            if (this._mode !== NeoPixelMode.RGBW)
                return;

            let br = this.brightness;
            if (br < 255) {
                white = (white * br) >> 8;
            }
            let buf = this.buf;
            let end = this.start + this._length;
            for (let i = this.start; i < end; ++i) {
                let ledoffset = i * 4;
                buf[ledoffset + 3] = white;
            }
        }
        private setPixelRGB(pixeloffset: number, rgb: number): void {
            if (pixeloffset < 0
                || pixeloffset >= this._length)
                return;

            let stride = this._mode === NeoPixelMode.RGBW ? 4 : 3;
            pixeloffset = (pixeloffset + this.start) * stride;

            let red = unpackR(rgb);
            let green = unpackG(rgb);
            let blue = unpackB(rgb);

            let br = this.brightness;

            this.setTrueColorsBufferRGB(pixeloffset, red, green, blue)

            if (br < 255) {
                red = (red * br) >> 8;
                green = (green * br) >> 8;
                blue = (blue * br) >> 8;
            }
            this.setBufferRGB(pixeloffset, red, green, blue)
        }
    }

    /**
     * Δημιουργία οδηγού για `numleds` LEDs.
     * @param pin το pin που βρίσκεται στη ταινία led
     * @param numleds αριθμός led στην ταινία, π.χ.: 24,30,60,64
     */
    //% blockId="neopixel_create" block="%pin|με %numleds|led σε λειτουργία %mode"
    //% weight=90 blockGap=8
    //% parts="neopixel"
    //% trackArgs=0,2
    //% blockSetVariable="ταινία led"
    function create(pin: DigitalPin, numleds: number, mode: NeoPixelMode): Strip {
        let strip = new Strip();
        let stride = mode === NeoPixelMode.RGBW ? 4 : 3;
        strip.buf = pins.createBuffer(numleds * stride);
        strip.start = 0;
        strip._length = numleds;
        strip._mode = mode || NeoPixelMode.RGB;
        strip._matrixWidth = 0;
        strip.setBrightness(10)
        strip.setPin(pin)
        strip.stripColor = NeoPixelColors.Orange;
        return strip;
    }

    /**
     * Converts red, green, blue channels into a RGB color
     * @param red value of the red channel between 0 and 255. eg: 255
     * @param green value of the green channel between 0 and 255. eg: 255
     * @param blue value of the blue channel between 0 and 255. eg: 255
     */
    // weight=1
    // blockId="neopixel_rgb"
    // block="red %red|green %green|blue %blue"
    // advanced=true
    export function rgb(red: number, green: number, blue: number): number {
        return packRGB(red, green, blue);
    }

    function packRGB(a: number, b: number, c: number): number {
        return ((a & 0xFF) << 16) | ((b & 0xFF) << 8) | (c & 0xFF);
    }
    function unpackR(rgb: number): number {
        let r = (rgb >> 16) & 0xFF;
        return r;
    }
    function unpackG(rgb: number): number {
        let g = (rgb >> 8) & 0xFF;
        return g;
    }
    function unpackB(rgb: number): number {
        let b = (rgb) & 0xFF;
        return b;
    }

    /**
     * Converts a hue saturation luminosity value into a RGB color
     * @param h hue from 0 to 360
     * @param s saturation from 0 to 99
     * @param l luminosity from 0 to 99
     */
    //% blockId=neopixelHSL block="hue %h|saturation %s|luminosity %l"
    function hsl(h: number, s: number, l: number): number {
        h = Math.round(h);
        s = Math.round(s);
        l = Math.round(l);

        h = h % 360;
        s = Math.clamp(0, 99, s);
        l = Math.clamp(0, 99, l);
        let c = Math.idiv((((100 - Math.abs(2 * l - 100)) * s) << 8), 10000); //chroma, [0,255]
        let h1 = Math.idiv(h, 60);//[0,6]
        let h2 = Math.idiv((h - h1 * 60) * 256, 60);//[0,255]
        let temp = Math.abs((((h1 % 2) << 8) + h2) - 256);
        let x = (c * (256 - (temp))) >> 8;//[0,255], second largest component of this color
        let r$: number;
        let g$: number;
        let b$: number;
        if (h1 == 0) {
            r$ = c; g$ = x; b$ = 0;
        } else if (h1 == 1) {
            r$ = x; g$ = c; b$ = 0;
        } else if (h1 == 2) {
            r$ = 0; g$ = c; b$ = x;
        } else if (h1 == 3) {
            r$ = 0; g$ = x; b$ = c;
        } else if (h1 == 4) {
            r$ = x; g$ = 0; b$ = c;
        } else if (h1 == 5) {
            r$ = c; g$ = 0; b$ = x;
        }
        let m = Math.idiv((Math.idiv((l * 2 << 8), 100) - c), 2);
        let r = r$ + m;
        let g = g$ + m;
        let b = b$ + m;
        return packRGB(r, g, b);
    }

    export enum HueInterpolationDirection {
        Clockwise,
        CounterClockwise,
        Shortest
    }


    //
    // PUBLIC Simplified NeoPixel API - RoBitZero - LedStrip
    //

    let rb0ledstip1: Strip;

    /**
     * Δημιουργία οδηγού για `numleds` LEDs.
     * @param pin το pin που βρίσκεται στη ταινία led
     * @param numleds αριθμός led στην ταινία, π.χ.: 24,30,60,64
     */
    //% blockId="rb0strip_simplecreate"
    //% block="LED strip at port %port|and contains %numleds|led"
    //% weight=90 color=100 blockGap=24
    //% numleds.defl=1
    export function rb0strip_createsimple(port: KeyestudioPort, numleds: number) {
        let pin = rb0base.getPinFromKeyestudioPort(port);
        rb0base.enablePin(pin);
        rb0ledstip1 = new Strip();
        let stride = 3;
        rb0ledstip1.buf = pins.createBuffer(numleds * stride);
        rb0ledstip1.start = 0;
        rb0ledstip1._length = numleds;
        rb0ledstip1._mode = NeoPixelMode.RGB;
        rb0ledstip1._matrixWidth = 0;
        rb0ledstip1.initTrueColors();
        rb0ledstip1.setPin(pin);
        rb0ledstip1.stripColor = NeoPixelColors.Orange;
        rb0ledstip1.setBrightness(30);
    }

    /**
     * Δημιουργία οδηγού για `numleds` LEDs.
     * @param pin το pin που βρίσκεται στη ταινία led
     * @param numleds αριθμός led στην ταινία, π.χ.: 24,30,60,64
     */
    //% blockId="rb0strip_advancedcreate"
    //% block="LED strip at %pin|and contains %numleds|led in operation %mode"
    //% weight=90 color=100 blockGap=24 advanced=true
    //% numleds.defl=1
    export function rb0strip_createadvanced(pin: DigitalPin, numleds: number, mode: NeoPixelMode): void {
        rb0ledstip1 = new Strip();
        let stride = mode === NeoPixelMode.RGBW ? 4 : 3;
        rb0ledstip1.buf = pins.createBuffer(numleds * stride);
        rb0ledstip1.start = 0;
        rb0ledstip1._length = numleds;
        rb0ledstip1._mode = mode || NeoPixelMode.RGB;
        rb0ledstip1._matrixWidth = 0;
        rb0ledstip1.initTrueColors();
        rb0ledstip1.setBrightness(10)
        rb0ledstip1.setPin(pin)
        rb0ledstip1.stripColor = NeoPixelColors.Orange;
        rb0ledstip1.setBrightness(30);
    }


    /**
     * Set LED to a given color (range 0-255 for r, g, b).
     * You need to call ``show`` to make the changes visible.
     * @param pixeloffset position of the NeoPixel in the strip
     * @param rgb RGB color of the LED
     */
    //% blockId="rb0strip_set_pixel_color"
    //% block="LED strip set led %pixeloffset| %rgb=neopixel_colors"
    //% weight=80 blockGap=24
    //% pixeloffset.defl=1
    export function setPixelColor(pixeloffset: number, rgb: number): void {
        pixeloffset = pixeloffset - 1;
        rb0ledstip1.setPixelColor(pixeloffset, rgb);
    }

    /**
    * Turn on all LEDs.
    */
    //% blockId="rb0strip_turnon"
    //% block="LED strip turn on"
    //% weight=78 blockGap=8
    export function turnOn(): void {
        rb0ledstip1.turnOn();
    }

    /**
    * Turn off all LEDs.
    */
    //% blockId="rb0strip_turnoff"
    //% block="LED strip turn off"
    //% weight=77 blockGap=24
    export function turnOff(): void {
        rb0ledstip1.turnOff();
    }

    /**
     * Clear all LEDs.
     * You need to call ``show`` to make the changes visible.
     */
    //% blockId="rb0strip_clear"
    //% block="LED strip clear leds"
    //% weight=87 advanced=true blockGap=8 blockHidden=true
    export function clear(): void {
        rb0ledstip1.clear();
    }

    /**
     * Shows all LEDs to a given color (range 0-255 for r, g, b).
     * @param rgb χρώμα RGB για τα LED
     */
    //% blockId="rb0strip_set_strip_color"
    //% block="LED strip show color %rgb=neopixel_colors"
    //% weight=85 blockGap=8
    export function showColor(rgb: number): void {
        rb0ledstip1.showColor(rgb);
    }

    /**
     * Rotate LEDs forward.
     * You need to call ``show`` to make the changes visible.
     * @param offset number of pixels to rotate forward, eg: 1
     */
    //% blockId="rb0strip_rotate"
    //% block="LED strip rotate pixels with step %offset|led"
    //% weight=39 advanced=true  blockGap=24
    export function rotate(offset: number = 1): void {
        rb0ledstip1.rotate(offset);
    }

    /**
     * Return "true" if the led strip is turned on
     * 
     */
    //% blockId="rb0strip_isturnedon"
    //% block="LED strip is turned on"
    //% group="Logic"
    //% weight=38 blockGap=8
    export function isStripTurnedOn(): boolean {
        return rb0ledstip1.isStripTurnedOn();
    }

    /**
    * Return "true" if the led strip is turned off
    * 
    */
    //% blockId="rb0strip_isturnedoff"
    //% block="LED strip is turned off"
    //% group="Logic"
    //% weight=37 blockGap=8
    export function isStripTurnedOff(): boolean {
        return !rb0ledstip1.isStripTurnedOn();
    }

    /**
     * Return "true" if the strip shows one or more leds with that color,
     * all the other leds should be black if one of the other leds is iscolored
     * differently then the function fails
     * @param color RGB color to check is the strip shows
     */
    //% blockId="rb0strip_iscolored"
    //% block="LED strip is colored %color"
    //% group="Logic"
    //% weight=35 blockGap=24
    export function isStripColored(color: NeoPixelColors): boolean {
        return rb0ledstip1.isStripColored(color);
    }

    /**
     * Set the brightness of the strip. This flag only applies to future operation.
     * @param brightness a measure of LED brightness in 0%-100%. eg: 50%
     */
    //% blockId="rb0strip_set_brightness"
    //% block="LED strip set brightness at %1\\%"
    //% brightness.min=0 brightness.max=100 brightness.defl=10
    //% weight=71 blockGap=24
    export function setBrightness(brightness: number): void {
        const clamped = Math.max(0, Math.min(100, brightness));
        let aBright = Math.map(clamped, 0, 100, 0, MAXBRIGHTNESS)
        rb0ledstip1.setBrightness(aBright);
    }

    /**
     * Gets the RGB value of a known color
    */
    //% weight=2 blockGap=8
    //% blockId="neopixel_colors"
    //% block="%color"
    //% group="Logic"
    //% color.defl=NeoPixelColors.White
    export function colors(color: NeoPixelColors): number {
        return color;
    }
}