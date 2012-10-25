function overload() {
    if (typeof (Geoportal) == 'undefined' ) window.setTimeout('overload()', 300);
    else {
        loadImage();
        //loadGeoRMHandler();
        loadGeolocate();
        clearDB();
        initDB();
        initSylvie();
    }
}
