
enum NeoPixelColors {
    //% block="white"
    //% block.loc.el="άσπρο"
    White = 0xAAAAAA,
    //% block="red"
    //% block.loc.el="κόκκινο"
    Red = 0xFF0000,
    //% block="green"
    //% block.loc.el="πράσινο"
    Green = 0x00FF00,
    //% block="blue"
    //% block.loc.el="μπλε"
    Blue = 0x0000FF,
    //% block="orange"
    //% block.loc.el="πορτοκαλί"
    Orange = 0xFF3300,
    //% block="yello"
    //% block.loc.el="κίτρινο"
    Yellow = 0xAA6600,
    //% block="purple"
    //% block.loc.el="μωβ"
    Purple = 0x8a2be2,
    //% block="black"
    //% block.loc.el="μαύρο"
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

enum KeyestudioPort {
    //% block="P0"
    P0,
    //% block="P1/P2"
    P1P2,
    //% block="P8/P3/P4"
    P8P3P4,
    //% block="P10"
    P10,
    //% block="P6/P7"
    P6P7,
    //% block="P5"
    P5,
    //% block="P11"
    P11,
    //% block="P12"
    P12
}

/**
 * Functions to operate NeoPixel strips.
 */
//% block="Led Strip"
//% block.loc.el="Ταινία Led"
//% weight=7 color=#e86800 icon="\uf0eb"
namespace rb0ledstrip {
    /**
     * A NeoPixel strip
     */
    class Strip {
        buf: Buffer;
        pin: DigitalPin;
        // TODO: encode as bytes instead of 32bit
        brightness: number;
        start: number; // start offset in LED strip
        stripColor: number;
        lighted: boolean;
        _length: number; // number of LEDs
        _mode: NeoPixelMode;
        _matrixWidth: number; // number of leds in a matrix - if any

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
            this.lighted = true;
            rgb = rgb >> 0;
            this.setAllRGB(rgb);
            this.show();
        }

        /**
         * Shows all LEDs to a given color (range 0-255 for r, g, b).
         * @param rgb χρώμα RGB για τα LED
         */
        //% blockId="neopixel_hideAllLeds" block="%strip|σβήσε όλα τα led"
        //% strip.defl="ταινία led"
        //% weight=85 blockGap=8
        //% parts="neopixel"
        hideAllLeds() {
            this.clear();
            this.setAllRGB(NeoPixelColors.Black);
            this.show();
        }

        /**
         * Shows a rainbow pattern on all LEDs.
         * @param startHue the start hue value for the rainbow, eg: 1
         * @param endHue the end hue value for the rainbow, eg: 360
         */
        //% blockId="neopixel_set_strip_rainbow" block="%strip|εμφάνισε ουράνιο τόξο από %startHue|μέχρι %endHue"
        //% strip.defl="ταινία led"
        //% weight=80 blockGap=8
        //% parts="neopixel" advanced=true
        showRainbow(startHue: number = 1, endHue: number = 360) {
            if (this._length <= 0) return;

            startHue = startHue >> 0;
            endHue = endHue >> 0;
            const saturation = 100;
            const luminance = 50;
            const steps = this._length;
            const direction = HueInterpolationDirection.Clockwise;

            //hue
            const h1 = startHue;
            const h2 = endHue;
            const hDistCW = ((h2 + 360) - h1) % 360;
            const hStepCW = Math.idiv((hDistCW * 100), steps);
            const hDistCCW = ((h1 + 360) - h2) % 360;
            const hStepCCW = Math.idiv(-(hDistCCW * 100), steps);
            let hStep: number;
            if (direction === HueInterpolationDirection.Clockwise) {
                hStep = hStepCW;
            } else if (direction === HueInterpolationDirection.CounterClockwise) {
                hStep = hStepCCW;
            } else {
                hStep = hDistCW < hDistCCW ? hStepCW : hStepCCW;
            }
            const h1_100 = h1 * 100; //we multiply by 100 so we keep more accurate results while doing interpolation

            //sat
            const s1 = saturation;
            const s2 = saturation;
            const sDist = s2 - s1;
            const sStep = Math.idiv(sDist, steps);
            const s1_100 = s1 * 100;

            //lum
            const l1 = luminance;
            const l2 = luminance;
            const lDist = l2 - l1;
            const lStep = Math.idiv(lDist, steps);
            const l1_100 = l1 * 100

            //interpolate
            if (steps === 1) {
                this.setPixelColor(0, hsl(h1 + hStep, s1 + sStep, l1 + lStep))
            } else {
                this.setPixelColor(0, hsl(startHue, saturation, luminance));
                for (let i = 1; i < steps - 1; i++) {
                    const h = Math.idiv((h1_100 + i * hStep), 100) + 360;
                    const s = Math.idiv((s1_100 + i * sStep), 100);
                    const l = Math.idiv((l1_100 + i * lStep), 100);
                    this.setPixelColor(i, hsl(h, s, l));
                }
                this.setPixelColor(steps - 1, hsl(endHue, saturation, luminance));
            }
            this.show();
        }

        /**
         * Displays a vertical bar graph based on the `value` and `high` value.
         * If `high` is 0, the chart gets adjusted automatically.
         * @param value current value to plot
         * @param high maximum value, eg: 255
         */
        //% weight=84
        //% blockId=neopixel_show_bar_graph block="%strip|show bar graph of %value|up to %high"
        //% strip.defl=strip
        //% icon="\uf080"
        //% parts="neopixel"
        private showBarGraph(value: number, high: number): void {
            if (high <= 0) {
                this.clear();
                this.setPixelColor(0, NeoPixelColors.Yellow);
                this.show();
                return;
            }

            value = Math.abs(value);
            const n = this._length;
            const n1 = n - 1;
            let v = Math.idiv((value * n), high);
            if (v == 0) {
                this.setPixelColor(0, 0x666600);
                for (let i = 1; i < n; ++i)
                    this.setPixelColor(i, 0);
            } else {
                for (let i = 0; i < n; ++i) {
                    if (i <= v) {
                        const b = Math.idiv(i * 255, n1);
                        this.setPixelColor(i, rb0ledstrip.rgb(b, 0, 255 - b));
                    }
                    else this.setPixelColor(i, 0);
                }
            }
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
        //% blockGap=8
        //% weight=80
        //% parts="neopixel"
        setPixelColor(pixeloffset: number, rgb: number): void {
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
        isStripColor(color: NeoPixelColors): boolean {
            return this.stripColor == color;
        }

        /**
         * Sets the number of pixels in a matrix shaped strip
         * @param width number of pixels in a row
         */
        //% blockId=neopixel_set_matrix_width block="%strip|set matrix width %width"
        //% strip.defl=strip
        //% blockGap=8
        //% weight=5
        //% parts="neopixel" advanced=true
        private setMatrixWidth(width: number) {
            this._matrixWidth = Math.min(this._length, width >> 0);
        }

        /**
         * Set LED to a given color (range 0-255 for r, g, b) in a matrix shaped strip
         * You need to call ``show`` to make the changes visible.
         * @param x horizontal position
         * @param y horizontal position
         * @param rgb RGB color of the LED
         */
        //% blockId="neopixel_set_matrix_color" block="%strip|set matrix color at x %x|y %y|to %rgb=neopixel_colors"
        //% strip.defl=strip
        //% weight=4
        //% parts="neopixel" advanced=true
        private setMatrixColor(x: number, y: number, rgb: number) {
            if (this._matrixWidth <= 0) return; // not a matrix, ignore
            x = x >> 0;
            y = y >> 0;
            rgb = rgb >> 0;
            const cols = Math.idiv(this._length, this._matrixWidth);
            if (x < 0 || x >= this._matrixWidth || y < 0 || y >= cols) return;
            let i = x + y * this._matrixWidth;
            this.setPixelColor(i, rgb);
        }

        /**
         * For NeoPixels with RGB+W LEDs, set the white LED brightness. This only works for RGB+W NeoPixels.
         * @param pixeloffset position of the LED in the strip
         * @param white brightness of the white LED
         */
        //% blockId="neopixel_set_pixel_white" block="%strip|set pixel white LED at %pixeloffset|to %white"
        //% strip.defl=strip
        //% blockGap=8
        //% weight=80
        //% parts="neopixel" advanced=true
        private setPixelWhiteLED(pixeloffset: number, white: number): void {
            if (this._mode === NeoPixelMode.RGBW) {
                this.setPixelW(pixeloffset >> 0, white >> 0);
            }
        }

        /**
        * Turn on all LEDs.
        */
        //% blockId="neopixel_lightAllLeds" block="%strip|άναψε όλα τα led"
        //% strip.defl="ταινία led"
        //% weight=88
        //% parts="neopixel"
        lightAllLeds(): void {
            this.showColor(this.stripColor);
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
            this.lighted = false;
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

        /**
         * Set the brightness of the strip. This flag only applies to future operation.
         * @param brightness a measure of LED brightness in 0-255. eg: 255
         */
        //% blockId="neopixel_set_brightness" block="%strip|όρισε τη φωτεινότητα σε %brightness" blockGap=8
        //% strip.defl="ταινία led"
        //% weight=59
        //% parts="neopixel" advanced=true
        setBrightness(brightness: number): void {
            this.brightness = brightness & 0xff;
        }

        /**
         * Apply brightness to current colors using a quadratic easing function.
         **/
        //% blockId="neopixel_each_brightness" block="%strip|ease brightness" blockGap=8
        //% strip.defl=strip
        //% weight=58
        //% parts="neopixel"
        private easeBrightness(): void {
            const stride = this._mode === NeoPixelMode.RGBW ? 4 : 3;
            const br = this.brightness;
            const buf = this.buf;
            const end = this.start + this._length;
            const mid = Math.idiv(this._length, 2);
            for (let i = this.start; i < end; ++i) {
                const k = i - this.start;
                const ledoffset = i * stride;
                const br = k > mid
                    ? Math.idiv(255 * (this._length - 1 - k) * (this._length - 1 - k), (mid * mid))
                    : Math.idiv(255 * k * k, (mid * mid));
                const r = (buf[ledoffset + 0] * br) >> 8; buf[ledoffset + 0] = r;
                const g = (buf[ledoffset + 1] * br) >> 8; buf[ledoffset + 1] = g;
                const b = (buf[ledoffset + 2] * br) >> 8; buf[ledoffset + 2] = b;
                if (stride == 4) {
                    const w = (buf[ledoffset + 3] * br) >> 8; buf[ledoffset + 3] = w;
                }
            }
        }

        /**
         * Create a range of LEDs.
         * @param start offset in the LED strip to start the range
         * @param length number of LEDs in the range. eg: 4
         */
        //% blockId="neopixel_range" block="%strip|από το led %start|με μήκος %length|led"
        //% strip.defl="ταινία led"
        //% weight=89
        //% parts="neopixel" advanced=true
        //% blockSetVariable="υποομάδα led"
        //% length.defl=5
        range(start: number = 0, length: number = 5): Strip {
            start = start >> 0;
            length = length >> 0;
            let strip = new Strip();
            strip.buf = this.buf;
            strip.pin = this.pin;
            strip.brightness = this.brightness;
            strip.start = this.start + Math.clamp(0, this._length - 1, start);
            strip._length = Math.clamp(0, this._length - (strip.start - this.start), length);
            strip._matrixWidth = 0;
            strip._mode = this._mode;
            return strip;
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
            this.show();
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
        isStripLighted(): boolean {
            return this.lighted == true;
        }

        /**
        * Return "true" if the led strip is lighted
        * 
        */
        //% blockId="neopixed_strip_isnotlighted" block="%strip|δεν είναι αναμμένη"
        //% strip.defl="ταινία led"
        //% weight=37
        //% parts="neopixel"
        isStripNotLighted(): boolean {
            return this.lighted == false;
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

        private setAllRGB(rgb: number) {
            let red = unpackR(rgb);
            let green = unpackG(rgb);
            let blue = unpackB(rgb);

            const br = this.brightness;
            if (br < 255) {
                red = (red * br) >> 8;
                green = (green * br) >> 8;
                blue = (blue * br) >> 8;
            }
            const end = this.start + this._length;
            const stride = this._mode === NeoPixelMode.RGBW ? 4 : 3;
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
            if (br < 255) {
                red = (red * br) >> 8;
                green = (green * br) >> 8;
                blue = (blue * br) >> 8;
            }
            this.setBufferRGB(pixeloffset, red, green, blue)
        }
        private setPixelW(pixeloffset: number, white: number): void {
            if (this._mode !== NeoPixelMode.RGBW)
                return;

            if (pixeloffset < 0
                || pixeloffset >= this._length)
                return;

            pixeloffset = (pixeloffset + this.start) * 4;

            let br = this.brightness;
            if (br < 255) {
                white = (white * br) >> 8;
            }
            let buf = this.buf;
            buf[pixeloffset + 3] = white;
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
    //% weight=1
    //% blockId="neopixel_rgb"
    //% block="red %red|green %green|blue %blue"
    //% block.loc.el="κόκκινο %red|πράσινο %green|μπλε %blue"
    //% advanced=true
    export function rgb(red: number, green: number, blue: number): number {
        return packRGB(red, green, blue);
    }

    /**
     * Gets the RGB value of a known color
    */
    //% weight=2 blockGap=8
    //% blockId="neopixel_colors" block="%color"
    export function colors(color: NeoPixelColors): number {
        return color;
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

    let rb0ledstip1: Strip;

    /**
     * Δημιουργία οδηγού για `numleds` LEDs.
     * @param pin το pin που βρίσκεται στη ταινία led
     * @param numleds αριθμός led στην ταινία, π.χ.: 24,30,60,64
     */
    //% blockId="rb0strip_simplecreate"
    //% block="led strip at port %port|and contains %numleds|led"
    //% block.loc.el="ταινία led στη θύρα %port|και έχει %numleds|led"
    //% weight=90 blockGap=8
    export function rb0strip_createsimple(port: KeyestudioPort, numleds: number) {
        enablePort(port);
        rb0ledstip1 = new Strip();
        let stride = 3;
        rb0ledstip1.buf = pins.createBuffer(numleds * stride);
        rb0ledstip1.start = 0;
        rb0ledstip1._length = numleds;
        rb0ledstip1._mode = NeoPixelMode.RGB;
        rb0ledstip1._matrixWidth = 0;
        rb0ledstip1.setPin(getPin(port));
        rb0ledstip1.stripColor = NeoPixelColors.Orange;
        rb0ledstip1.setBrightness(10);
    }

    /**
     * Δημιουργία οδηγού για `numleds` LEDs.
     * @param pin το pin που βρίσκεται στη ταινία led
     * @param numleds αριθμός led στην ταινία, π.χ.: 24,30,60,64
     */
    //% blockId="rb0strip_advancedcreate"
    //% block="led strip at %pin|and contains %numleds|led in operation %mode"
    //% block.loc.el="ταινία led στο %pin|με %numleds|led σε λειτουργία %mode"
    //% weight=90 blockGap=8 advanced=true
    export function rb0strip_createadvanced(pin: DigitalPin, numleds: number, mode: NeoPixelMode): void {
        rb0ledstip1 = new Strip();
        let stride = mode === NeoPixelMode.RGBW ? 4 : 3;
        rb0ledstip1.buf = pins.createBuffer(numleds * stride);
        rb0ledstip1.start = 0;
        rb0ledstip1._length = numleds;
        rb0ledstip1._mode = mode || NeoPixelMode.RGB;
        rb0ledstip1._matrixWidth = 0;
        rb0ledstip1.setBrightness(10)
        rb0ledstip1.setPin(pin)
        rb0ledstip1.stripColor = NeoPixelColors.Orange;
    }


    /**
     * Set LED to a given color (range 0-255 for r, g, b).
     * You need to call ``show`` to make the changes visible.
     * @param pixeloffset position of the NeoPixel in the strip
     * @param rgb RGB color of the LED
     */
    //% blockId="rb0strip_set_pixel_color"
    //% block="led strip set led %pixeloffset| %rgb=neopixel_colors"
    //% block.loc.el="ταινία led άλλαξε το led %pixeloffset|σε %rgb=neopixel_colors"
    //% weight=80 blockGap=8
    export function setPixelColor(pixeloffset: number, rgb: number): void {
        pixeloffset = pixeloffset - 1;
        rb0ledstip1.setPixelColor(pixeloffset, rgb);
    }

    /**
    * Turn on all LEDs.
    */
    //% blockId="rb0strip_light_all_leds"
    //% block="led strip show all leds"
    //% block.loc.el="ταινία led άναψε όλα τα led"
    //% weight=88 advanced=true
    export function lightAllLeds(): void {
        rb0ledstip1.showColor(rb0ledstip1.stripColor);
    }

    /**
    * Turn off all LEDs.
    */
    //% blockId="rb0strip_hide"
    //% block="led strip hide all leds"
    //% block.loc.el="ταινία led σβήσε όλα τα led"
    //% weight=77
    export function hide(): void {
        rb0ledstip1.hideAllLeds();
    }

    /**
     * Turn off all LEDs.
     * You need to call ``show`` to make the changes visible.
     */
    //% blockId="rb0strip_clear"
    //% block="led strip clear leds"
    //% block.loc.el="ταινία led μηδένισε όλα τα led"
    //% weight=87 advanced=true
    export function clear(): void {
        rb0ledstip1.clear();
    }

    /**
     * Shows all LEDs to a given color (range 0-255 for r, g, b).
     * @param rgb χρώμα RGB για τα LED
     */
    //% blockId="rb0strip_set_strip_color"
    //% block="led strip show color %rgb=neopixel_colors"
    //% block.loc.el="ταινία led εμφάνισε %rgb=neopixel_colors χρώμα"
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
    //% block="led strip rotate pixels with step %offset|led"
    //% block.loc.el="ταινία led περιέστρεψε τα χρώματα κατά %offset|led"
    //% weight=39 advanced=true  blockGap=8
    export function rotate(offset: number = 1): void {
        rb0ledstip1.rotate(offset);
    }

    /**
     * Return "true" if the led strip is lighted
     * 
     */
    //% blockId="rb0strip_islighted"
    //% block="led strip is lighted"
    //% block.loc.el="ταινία led είναι αναμμένη"
    //% weight=38
    export function isStripLighted(): boolean {
        return rb0ledstip1.isStripLighted();
    }

    /**
    * Return "true" if the led strip is lighted
    * 
    */
    //% blockId="rb0strip_isnotlighted"
    //% block="led strip is not lighted"
    //% block.loc.el="ταινία led δεν είναι αναμμένη"
    //% weight=37
    export function isStripNotLighted(): boolean {
        return rb0ledstip1.isStripNotLighted();
    }

    /**
     * Return "true" if the strip showns color is equal to "color" parameter
     * You need to call ``show`` to make the changes visible.
     * @param pixeloffset position of the NeoPixel in the strip
     * @param rgb RGB color of the LED
     */
    //% blockId="rb0strip_iscolored"
    //% block="led strip is showing %color"
    //% block.loc.el="ταινία led δείχνει %color|χρώμα"
    //% weight=35
    export function isStripColored(color: NeoPixelColors): boolean {
        return rb0ledstip1.isStripColor(color);
    }

    /**
     * Set the brightness of the strip. This flag only applies to future operation.
     * @param brightness a measure of LED brightness in 0-255. eg: 255
     */
    //% blockId="rb0strip_set_brightness"
    //% block="led strip set brightness at %brightness"
    //% block.loc.el="ταινία led όρισε τη φωτεινότητα σε %brightness"
    //% weight=59 advanced=true blockGap=8
    export function setBrightness(brightness: number): void {
        rb0ledstip1.setBrightness(brightness);
    }

    /**
     * Gets the RGB value of a known color
    */
    //% weight=2 blockGap=8
    //% blockId="rb0strip_getColor"
    export function getColor(color: NeoPixelColors): number {
        return color;
    }

    //% blockId="rb0strip_getPin"
    function getPin(port: KeyestudioPort): DigitalPin {
        switch (port) {
            case KeyestudioPort.P0:
                return DigitalPin.P0;
                break;
            case KeyestudioPort.P1P2:
                return DigitalPin.P1;
                break;
            case KeyestudioPort.P8P3P4:
                return DigitalPin.P8;
                break;
            case KeyestudioPort.P10:
                return DigitalPin.P10;
                break;
            case KeyestudioPort.P6P7:
                return DigitalPin.P7;
                break;
            case KeyestudioPort.P5:
                return DigitalPin.P5;
                break;
            case KeyestudioPort.P11:
                return DigitalPin.P11;
                break;
            case KeyestudioPort.P12:
                return DigitalPin.P12;
                break;
            default:
                return DigitalPin.P0;
                break;
        }
    }

    function enablePort(port: KeyestudioPort): void {
        if (port === KeyestudioPort.P10
            || port === KeyestudioPort.P6P7) {
            led.enable(false)
        }
    }
}
