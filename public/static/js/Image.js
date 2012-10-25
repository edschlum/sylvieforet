function loadImage() {
/*
 * Copyright (c) 2008-2011 Institut Geographique National France, released under the
 * BSD license.
 */
/*
 * @requires Geoportal/Tile.js
 */
/**
 * Class: Geoportal.Tile.Image
 * The Geoportal framework image class.
 *
 * Inherits from:
 * - {<OpenLayers.Tile.Image>}
 */
Geoportal.Tile.Image =
    OpenLayers.Class( OpenLayers.Tile.Image, {

    /**
     * APIMethod: setSize
     * Allows changing tile size.
     *
     * Parameters:
     * size - {<OpenLayers.Size>} image size
     */
    setSize: function (size) {
        if (this.frame != null) {
            OpenLayers.Util.modifyDOMElement(this.frame, null, null, size);
            this.size = size;
            if (this.imgDiv != null) {
                OpenLayers.Util.modifyDOMElement(this.imgDiv, null, null, size);
            }
        }
    },

    /**
     * Method: resetBackBuffer
     * Triggered by two different events, layer loadend, and tile loadend.
     *     In any of these cases, we check to see if we can hide the
     *     backBufferTile yet and update its parameters to match the
     *     foreground tile.
     *
     * Basic logic:
     *  - If the backBufferTile hasn't been drawn yet, reset it
     *  - If layer is still loading, show foreground tile but don't hide
     *    the backBufferTile yet
     *  - If layer is done loading, reset backBuffer tile and show
     *    foreground tile
     */
    resetBackBuffer: function() {
        this.showTile();
        if (this.backBufferTile &&
            (this.isFirstDraw || !this.layer.numLoadingTiles)) {
            this.isFirstDraw = false;
            // check to see if the backBufferTile is within the max extents
            // before rendering it
            var maxExtent = this.layer.maxExtent;
            var withinMaxExtent = (maxExtent &&
                                   this.bounds.intersectsBounds(maxExtent, false));
            if (withinMaxExtent) {
                this.backBufferTile.position = this.position;
                this.backBufferTile.bounds = this.bounds;
                this.backBufferTile.size = this.size;
                this.backBufferTile.imageSize = this.size || this.layer.getImageSize();//IGN
                this.backBufferTile.imageOffset = this.layer.imageOffset;
                this.backBufferTile.resolution = this.layer.getResolution();
                this.backBufferTile.renderTile();
            }
        }
    },

    /**
     * Method: positionImage
     * Using the properties currenty set on the layer, position the tile
     * correctly.
     * This method is used both by the async and non-async versions of the
     * Tile.Image
     * code.
     */
     positionImage: function() {
        // if the this layer doesn't exist at the point the image is
        // returned, do not attempt to use it for size computation
        if ( this.layer == null )
            return;

        // position the frame
        OpenLayers.Util.modifyDOMElement(this.frame,
                                          null, this.position, this.size);

        var imageSize = this.size || this.layer.getImageSize(this.bounds);//IGN
        if (this.layerAlphaHack) {
            OpenLayers.Util.modifyAlphaImageDiv(this.imgDiv,
                    null, null, imageSize, this.url);
        } else {
            OpenLayers.Util.modifyDOMElement(this.imgDiv,
                    null, null, imageSize) ;
//	    this.url=this.url.replace("GEOGRAPHICALGRIDSYSTEMS.MAPS","GEOGRAPHICALGRIDSYSTEMS.ETATMAJOR40");
	    console.log(this.url);
            setImage(this);
            //if (cacheMode||noconnexion) setImage(this);
            //else this.imgDiv.src = this.url;
        }
    },

    /**
     * Method: initImgDiv
     * Creates the imgDiv property on the tile.
     */
    initImgDiv: function() {

        var offset = this.layer.imageOffset;
        var size = this.size || this.layer.getImageSize(this.bounds);//IGN

        if (this.layerAlphaHack) {
            this.imgDiv = OpenLayers.Util.createAlphaImageDiv(null,
                                                           offset,
                                                           size,
                                                           null,
                                                           "relative",
                                                           null,
                                                           null,
                                                           null,
                                                           true);
        } else {
            this.imgDiv = OpenLayers.Util.createImage(null,
                                                      offset,
                                                      size,
                                                      null,
                                                      "relative",
                                                      null,
                                                      null,
                                                      true);
        }

        this.imgDiv.className = 'olTileImage';

        /* checkImgURL used to be used to called as a work around, but it
           ended up hiding problems instead of solving them and broke things
           like relative URLs. See discussion on the dev list:
           http://openlayers.org/pipermail/dev/2007-January/000205.html

        OpenLayers.Event.observe( this.imgDiv, "load",
            OpenLayers.Function.bind(this.checkImgURL, this) );
        */
        this.frame.style.zIndex = this.isBackBuffer ? 0 : 1;
        this.frame.appendChild(this.imgDiv);
        this.layer.div.appendChild(this.frame);

        if(this.layer.opacity != null) {

            OpenLayers.Util.modifyDOMElement(this.imgDiv, null, null, null,
                                             null, null, null,
                                             this.layer.opacity);
        }

        // we need this reference to check back the viewRequestID
        this.imgDiv.map = this.layer.map;
        // IGNF: put reference to layer => better handling for error's image
        // FIXME: map could then be replaced with layer.map
        this.imgDiv.layer= this.layer;

        //bind a listener to the onload of the image div so that we
        // can register when a tile has finished loading.
        var onload = function() {

            //normally isLoading should always be true here but there are some
            // right funky conditions where loading and then reloading a tile
            // with the same url *really*fast*. this check prevents sending
            // a 'loadend' if the msg has already been sent
            //
            if (this.isLoading) {
                this.isLoading = false;
                this.events.triggerEvent("loadend");
            }
        };

        if (this.layerAlphaHack) {
            OpenLayers.Event.observe(this.imgDiv.childNodes[0], 'load',
                                     OpenLayers.Function.bind(onload, this));
        } else {
            OpenLayers.Event.observe(this.imgDiv, 'load',
                                 OpenLayers.Function.bind(onload, this));
        }


        // Bind a listener to the onerror of the image div so that we
        // can register when a tile has finished loading with errors.
        var onerror = function() {

            // If we have gone through all image reload attempts, it is time
            // to realize that we are done with this image. Since
            // OpenLayers.Util.onImageLoadError already has taken care about
            // the error, we can continue as if the image was loaded
            // successfully.
            if (this.imgDiv._attempts > OpenLayers.IMAGE_RELOAD_ATTEMPTS) {
                onload.call(this);
            }
        };
        OpenLayers.Event.observe(this.imgDiv, "error",
                                 OpenLayers.Function.bind(onerror, this));
    },

    /**
     * Constant: CLASS_NAME
     * {String} *"Geoportal.Tile.Image"*
     */
    CLASS_NAME: "Geoportal.Tile.Image"
});
}
