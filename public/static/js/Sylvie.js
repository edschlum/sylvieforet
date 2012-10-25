var server = "http://sylvie.alwaysdata.net";
var signature = 0;
var email = "";
var password = "";
var mapindex = 0;
var objectindex = 0;
var pointindex = 0;
var editMode = false;
var geolocation = false;
var viewer = null;
var map = null;
var userLayer = null;
var currentLonLat = null;
var currentGpsCenter=null;
var currentZoom=17;
var currentObject = [];
var currentLines = [];
var currentPolygones = [];
var currentObjectList = [];
var currentObjectType = [];
var objectList = [];
var jQT = new $.jQTouch();
var cacheMode = false;
var noconnexion = false;
var sync = false;
var toolsToggle=false;
var gpsToggle = false;
var viewer_initialized = false;
var utilisateur = window.localStorage["utilisateur"];
var mdp = window.localStorage["mdp"];
var MAX_ZOOM_LEVEL = 20;
var MIN_ZOOM_LEVEL = 10;
var layerList = [];
var localObjectList = [];
var addPointControl = {};
var selectControl = {};
var geolocate;
var vector;
var firstGeolocation = true;
var pulsate;
var categories = ["Point", "Zone", "Chemin"];
var ulArray = [];
var pageNumber = 0;
var number = 0;
var mapcount=0;
var mapPerPage=7;

function initSylvie() {
    currentLonLat = new OpenLayers.LonLat(264662.370301, 5464313.45513);
    $("#connexion").show();
    ////////////////DEBUG//////////////////////////////////
    localObjectList[1] = {
                        mid: 0,
                        oid: 1,
                        name: "Test",
                        category: "Zone",
                        lock: 0,
                        points: []
    };
    //////////////////////////////////////////////////////
    initApp();
}
var layers = [{
    label: "GEOGRAPHICALGRIDSYSTEMS.MAPS:WMSC",
    name: "Cartes",
    selected: true
}, {
    label: 'ORTHOIMAGERY.ORTHOPHOTOS:WMSC',
    name: "Photos",
    selected: false
}, {
    label: "CADASTRALPARCELS.PARCELS:WMSC",
    name: "Cadastre",
    selected: false
},
/*{
    label: "ELEVATION.SLOPS:WMSC",
    name: "Courbes de niveaux",
    selected: false
}, {
    label: "HYDROGRAPHY.HYDROGRAPHY:WMSC",
    name: "Réseaux hydrographiques",
    selected: false
}, {
    label: "ORTHOIMAGERY.ORTHOPHOTOS:WMSC",
    name: "Vues aériennes",
    selected: false
}, {
    label: "ELEVATION.LEVEL0:WMSC",
    name: "Traits de côte",
    selected: false
}, {
    label: "ADMINISTRATIVEUNITS.BOUNDARIES:WMSC",
    name: "Limites administratives",
    selected: false
}, {
    label: "BUILDINGS.BUILDINGS:WMSC",
    name: "Constructions",
    selected: false
}, {
    label: "TRANSPORTNETWORKS.RUNWAYS:WMSC",
    name: "Pistes d'aérodromes",
    selected: false
}, {
    label: "TRANSPORTNETWORKS.RAILWAYS:WMSC",
    name: "Réseaux ferroviaires",
    selected: false
}, {
    label: "TRANSPORTNETWORKS.ROADS:WMSC",
    name: "Réseaux routiers",
    selected: false
}*/
];

function initApp() {
    if (utilisateur != null && mdp != null) {
        $("#login").attr('value', utilisateur);
        $("#password").attr('value', mdp);
    }
    document.getElementById("icon-cache").style.opacity=0.5;
    document.getElementById("icon-connexion").style.opacity=1;
    $("#gps-button").attr('style', 'left:5px;width:30px;opacity:1;');
    document.getElementById("icon-toolbar").style.display='none';
    document.getElementById("icon-layer").style.display='none';
    document.getElementById("icon-cache").style.display='none';
    document.getElementById("icon-connexion").style.display='none';
    document.getElementById("icon-flush").style.display='none';
    document.getElementById('icon-flush').style.background="url(/static/images/icon-flushed.png)";
    cacheMode = false;
    noconnexion = false;
    sync = false;
    document.addEventListener("touchstart", touch_handler, true);
    document.addEventListener("touchmove", touch_handler, true);
    document.addEventListener("touchend", touch_handler, true);
    document.addEventListener("touchcancel", touch_handler, true);
    initGps();
    $.ajaxSetup({
		error:function(x,e){
			if(x.status==0){
			alert('You are offline!!\n Please Check Your Network.');
			}else if(x.status==404){
			alert('Requested URL not found.');
			}else if(x.status==500){
			alert('Internel Server Error.');
			}else if(e=='parsererror'){
			alert('Error.\nParsing JSON Request failed.');
			}else if(e=='timeout'){
			alert('Request Time out.');
			}else {
			alert('Unknow Error.\n'+x.responseText);
			}
		}
	});
    startNavigation();
    if (utilisateur != null && mdp != null) login(utilisateur, mdp);
    currentZoom = 17;
    layerList = [];
    getLayersToShow();
    window.addEventListener("orientationchange", updateOrientation, false);
}

function touch_handler(event) {
    var touches = event.changedTouches;
    var first = touches[0];
    var type;
    switch (event.type) {
    case "touchstart":
        type = "mousedown";
        break;
    case "touchmove":
        type = "mousemove";
        event.preventDefault();
        break;
    case "touchend":
        type = "mouseup";
        break;
    default:
        return;
    }
    var simulated = document.createEvent("MouseEvent");
    simulated.initMouseEvent(type, true, true, window, 1, first.screenX, first.screenY, first.clientX, first.clientY, false, false, false, false, 0, null);
    first.target.dispatchEvent(simulated);
}

function login(email, password) {
    $(function () {
        $.get(server + "/login/" + email + "&" + password, function (data) {
            if (data) {
                if (data == "success") {
                    jQT.goTo('#loading-page');
                    handleMap();
                }
            }
        });
    });
}

function initGps() {
    vector = new OpenLayers.Layer.Vector('vector');
    pulsate = function (feature) {
        var point = feature.geometry.getCentroid(),
            bounds = feature.geometry.getBounds(),
            radius = Math.abs((bounds.right - bounds.left) / 2),
            count = 0,
            grow = 'up';
        var resize = function () {
                if (count > 16) {
                    clearInterval(window.resizeInterval);
                }
                var interval = radius * 0.03;
                var ratio = interval / radius;
                switch (count) {
                case 4:
                case 12:
                    grow = 'down';
                    break;
                case 8:
                    grow = 'up';
                    break;
                }
                if (grow !== 'up') {
                    ratio = -Math.abs(ratio);
                }
                feature.geometry.resize(1 + ratio, point);
                vector.drawFeature(feature);
                count++;
            };
        window.resizeInterval = window.setInterval(resize, 50, point, radius);
    };
}

function addMap(index, title, desc) {
    $("#map-list .items ul").append('<li class="arrow" mapcount='+mapcount+' style="display:'+((++mapcount)>mapPerPage?'none':'block')+'">' + '<a class="map-open" mapindex="' + index + '">' + Base64.decode(title) + '</a>' + '</li>');
    return;
}

function preGetMap() {
    mapcount=0;
    $("#map-list .items ul").empty();
    signature += 1;
    return;
}

function postGetMap() {
    document.getElementById("loading-page").innerHTML+="<br>Fin du chargement des cartes...";
    $(".map-open").click(function (e) {
        mapindex = $(e.target).attr('mapindex');
        $('#map-options').show('slide', {
            direction: 'down'
        });
    });
    //////////////////////////
    $(function(){
    var l =mapcount ;
    console.log("DEBUG : l = "+l);
    if (l>mapPerPage){
        $("#map-list .items ul").append('<li class="arrow"><a id="map-plus">Autres cartes...</a></li>');
        $("#map-plus").click(function(e){
            console.log("DEBUG map-plus");
            var i = 0;
            while($("#map-item .arrow[mapcount="+i+"]").attr("style")=="display:none") i++;
            var j=0;
            for(j=i; j<l&&j<i+mapPerPage; j++) $("#map-item .arrow")[j].setAttribute("style","display:none");
            j%=l;
            for(i=j; i<l&&i<j+mapPerPage; i++) $("#map-item .arrow")[i].setAttribute("style","display:block");
        });
    }
    });
    //////////////////////////
    document.getElementById("loading-page").innerHTML="Chargement/synchronisation en cours...";
    jQT.goTo('#map-list', 'slide');
    return;
}

function getMap(sig, i, next) {
    document.getElementById("loading-page").innerHTML+="<br>Chargement de la carte "+i+"...";
    $(function () {
        $.get(server + "/getMap/" + sig + "&" + i, function (data) {
            if (data) {
                res = data.split('_');
                if (parseInt(res[0]) == signature) addMap(res[1], res[2], res[3]);
                if (next.length == 0) return postGetMap();
                return getMap(sig, next[0], next.slice(1));
            }
        });
    });
}

function getMapList(sig) {
    document.getElementById("loading-page").innerHTML+="<br>Chargement de la liste des cartes...";
    $(function () {
        $.get(server + "/getMapList/", function (data) {
            if (data) {
                res = data.split('_');
                if (res == "empty") {postGetMap();/*jQT.goTo('#map-list', 'slide');*/return;}
                res = res.map(function (x) {return parseInt(x);});
                res = res.reverse();
                getMap(sig, res[0], res.splice(1));
            }
        });
    });
}

function handleMap() {
    document.getElementById("loading-page").innerHTML+="<br>Initialisation du chargement...";
    preGetMap();
    getMapList(signature);
}

function newObject() {
    objectindex = 0;
    jQT.goTo('#object-edit', 'slide');
    return;
};

function getObjectList() {
    objectList = [];
    var count=0;
    var number=0;
    var ul=document.createElement("ul");
    var contenu;
    ulArray=[];
    for (var i in localObjectList) {
        if ((count++)%4==0) {
	    contenu="";
            if (count>0) ul.innerHTML+='<li class="arrow"><a id="plus">Tracés suivants...</a></li>';
            ul = document.createElement("ul");
            ulArray.push(ul);
        }
        var index = localObjectList[i].oid;
        var category = localObjectList[i].category;
        var title = localObjectList[i].name;
        contenu+='<li class="arrow">' + '<a class="object-open" objectindex="' + index + '">' + category + ' - ' + title + '</a>' + '<input type="checkbox" checked=true id="checkbox' + index + '"/ >' + '</li>';
    	ul.innerHTML='<li class="arrow"><a onclick="javascript:newObject();">Ajouter un nouveau tracé...</a></li>'+contenu;
    }
    if (ulArray.length>1)ulArray[ulArray.length-1].innerHTML+='<li class="arrow"><a id="plus">Tracés précédents...</a></li>';
    pageNumber=0;
    if (ulArray.length==0){
        ul.innerHTML='<li class="arrow"><a onclick="javascript:newObject();">Ajouter un nouveau tracé...</a></li>';
        ulArray[0]=ul;
    }
    $("#object-list .items").html("");
    $("#object-list .items").append(ulArray[pageNumber]);
    $("#plus").click(setRecursiveControl);
}

function setRecursiveControl(){ 
       pageNumber++;
       $("#object-list .items").html("");
       $("#object-list .items").append(ulArray[pageNumber%ulArray.length]);
       postGetObject();
       $("#plus").click(setRecursiveControl);
     }


function postGetObject() {
    $("#map-show").attr('style', 'visibility:hidden;');
    if (localObjectList.length > 0) {
        $("#map-show").attr('style', 'visibility:visible;');
    }
    $(".object-open").click(function (e) {
        objectindex = $(e.target).attr('objectindex');
        $('#object-options').show('slide', {
            direction: 'down'
        });
    });
    return;
}

function handleObject() {
    preGetObject();
    getObjectList();
    postGetObject();
}

function preGetObject() {
    $("#object-list .items ul").empty();
    return;
}

function addShare(index, title) {
    $("#permission-list .items ul").append('<li class="arrow">' + '<a class="permission-open" permissionindex="' + index + '">' + title + '</a>' + '</li>');
    return;
}

function preGetShare() {
    $("#permission-list .items ul").empty();
    signature += 1;
    return;
}

/*
function postGetShare() {
    return;
}
*/

function getShare(sig, i, next) {
    $(function () {
        $.get(server + "/getShare/" + sig + "&" + mapindex + "&" + i, function (data) {
            if (data) {
                res = data.split('_');
                if (parseInt(res[0]) == signature) addShare(res[1], res[2]);
                if (next.length == 0) return /*postGetShare()*/;
                return getShare(sig, next[0], next.slice(1));
            }
        });
    });
}

function getShareList(sig) {
    $(function () {
        $.get(server + "/getShareList/" + mapindex, function (data) {
            if (data) {
                res = data.split('_');
                if (res.length > 0) {
                    getShare(sig, res[0], res.splice(1));
                } else {
                    return;
                }
            }
        });
    });
}

function insertShare(suname, boucle) {
    $(function () {
        $.get(server + "/insertShare/" + mapindex + "&" + suname, function (data) {
            if (data) {
                if (data == "success") boucle();
                return;
            }
        });
    });
}

function handleShare() {
    preGetShare();
    getShareList(signature);
}



function goToMap () {
    jQT.goTo('#loading-page');
    signature++;
    document.getElementById("loading-page").innerHTML+="<br>Initialisation du chargement...";
    synchronizeFrom(
    function () {
        document.getElementById("loading-page").innerHTML+="<br>Fin du chargement...";
        //////////////////////////////////////////////////////////////
        //jQT.goTo('#object-list', 'slide');
        currentLines = [];
        editMode = false;
        objectList=[];
        for (var i in localObjectList){
            objectList.push(localObjectList[i].oid);
        }
        buildCurrentObjectList();
        if (currentObjectList.length > 0 && currentObjectList[0].length)currentLonLat = new OpenLayers.LonLat(currentObjectList[0][0].lon, currentObjectList[0][0].lat);
        initViewer();
        updateUserLayer();
        updateGeoportalLayers();
        map.addLayers([userLayer, vector]);
        createControls(true);
        currentZoom=8;
        currentLonLat = new OpenLayers.LonLat(-37924.0, 4926381.0);
        setCenterMap();
        $('#map-options').hide('slide', {
            direction: 'down'
        });
        document.getElementById("loading-page").innerHTML="Chargement/synchronisation en cours...";
        jQT.goTo('#map', 'slide');
        //////////////////////////////////////////////////////////////
    });
}

function updateOrientation() {
    if (document.getElementById("map-view")&&document.getElementById("map-view_OlMap"))
        document.getElementById("map-view").style.height="100%";document.getElementById("map-view_OlMap").style.height="100%";
        document.getElementById("map-view").style.width="100%";document.getElementById("map-view_OlMap").style.width="100%";
}

function startNavigation() {
    $("#connexion #button_connexion").click(function (e) {
        email = $("#connexion #login").val();
        password = $("#connexion #password").val();
        try {
            window.localStorage["utilisateur"] = email;
            window.localStorage["mdp"] = password;
            utilisateur = window.localStorage["utilisateur"];
            mdp = window.localStorage["mdp"];
        } catch (e) {
            //console.log(e);
        }
        login(email, password);
    });
    $('#map-list').bind('pageAnimationEnd', function (event, info) {
        if (info.direction == 'in') {}
        if (info.direction == 'out') {
            $("#map-list .items ul").empty();
        }
    });
    $('#object-list').bind('pageAnimationEnd', function (event, info) {
        if (info.direction == 'in') {
            handleObject();
        }
        if (info.direction == 'out') {
            //$("#object-list .items ul").empty();
        }
    });
    $('#permission-list').bind('pageAnimationEnd', function (event, info) {
        if (info.direction == 'in') {
            handleShare();
        }
        if (info.direction == 'out') {
            $("#permission-list .items ul").empty();
        }
    });
    $("#map-options #show").click(
        function (e) {
            goToMap();
        }
    );
    $("#map-options #share").click(function (e) {
        jQT.goTo('#permission-list', 'slide');
        $('#map-options').hide('slide', {
            direction: 'down'
        });
    });
    $("#map-options #change").click(function (e) {
        jQT.goTo('#map-edit', 'slide');
        $('#map-options').hide('slide', {
            direction: 'down'
        });
    });
    $("#map-options #cancel").click(function (e) {
        $('#map-options').hide('slide', {
            direction: 'down'
        });
    });
    $("#map-options #delete").click(function (e) {
        $('#map-options').hide('slide', {
            direction: 'down'
        });
        jQT.goTo('#loading-page'/*, 'slide'*/);
        $(function(){
            $.get(server + "/deleteMap/" + mapindex, function (data) {
                if (data) {
                    document.getElementById("loading-page").innerHTML+=data;
                    //alert(data);
                    if (data == "success") handleMap();
                    else return;
                }
            });
        });
    });
    $("#object-options #change").click(function (e) {
        jQT.goTo('#object-edit', 'slide');
        $('#object-options').hide('slide', {
            direction: 'down'
        });
    });
    $("#object-options #cancel").click(function (e) {
        $('#object-options').hide('slide', {
            direction: 'down'
        });
    });
    $("#object-options #delete").click(function (e) {
        delete localObjectList[objectindex];
        handleObject();
        $('#object-options').hide('slide', {
            direction: 'down'
        });
    });
    for (var l in layers) {
        if (!layers[l].selected) $("#layer-list .items ul").append('<li class="arrow">' + '<a>' + layers[l].name + '</a>' + '<input type="checkbox" id="geolayer' + l + '" /></label>' + '</li>');
        else $("#layer-list .items ul").append('<li class="arrow">' + '<a>' + layers[l].name + '</a>' + '<input type="checkbox" checked="yes" id="geolayer' + l + '" /></label>' + '</li>');
    }
    $('#icon-layer').click(function (e) {
        jQT.goTo('#layer-list', 'slide');
    });
    $('#map-show').click(function (e) {
        currentLines = [];
        editMode = false;
        getObjectsToShow();
        buildCurrentObjectList();
        if (currentObjectList.length > 0 && currentObjectList[0].length) currentLonLat = new OpenLayers.LonLat(currentObjectList[0][0].lon, currentObjectList[0][0].lat);
        initViewer();
        updateUserLayer();
        updateGeoportalLayers();
        map.addLayers([userLayer, vector]);
        createControls(true);
        currentZoom=17;
        setCenterMap();
        jQT.goTo('#map', 'slide');
        /*
        $(function(){
            startGPS();
        });
        */
    });
    $("#map #tools-button").click(function (e) {
        if (!toolsToggle) {
            toolsToggle=true;
            document.getElementById("icon-toolbar").style.display='block';
            document.getElementById("icon-layer").style.display='block';
            document.getElementById("icon-cache").style.display='block';
            document.getElementById("icon-connexion").style.display='block';
            document.getElementById("icon-flush").style.display='block';
        }else{
            toolsToggle=false;
            document.getElementById("icon-toolbar").style.display='none';
            document.getElementById("icon-layer").style.display='none';
            document.getElementById("icon-cache").style.display='none';
            document.getElementById("icon-connexion").style.display='none';
            document.getElementById("icon-flush").style.display='none';
        }
    });
    $("#map #gps-button").click(function (e) {
        if (!gpsToggle) {
            gpsToggle = true;
            $("#gps-state").html("Acquisition des données GPS");
            vector.removeAllFeatures();
            geolocate.deactivate();
            geolocate.watch = true;
            firstGeolocation = true;
            geolocate.activate();
            $("#gps-button").attr('style', 'left:5px;width:30px;opacity:0.5;');
        }else{
            gpsToggle=false;
            $("#gps-state").html("");
            vector.removeAllFeatures();
            geolocate.deactivate();
            $("#gps-button").attr('style', 'left:5px;width:30px;opacity:1;');
        }
    });
    $("#map #icon-connexion").click(function (e) {
        noconnexion = !noconnexion;
        if (noconnexion) {
            cacheMode = false;
            document.getElementById('icon-connexion').style.opacity=0.5;
            document.getElementById('icon-cache').style.opacity=0.5;
        } else {
            cacheMode = false;
            document.getElementById('icon-connexion').style.opacity=1;
            currentLonLat = map.getCenter();
            initViewer();
            updateGeoportalLayers();
            map.addLayers([userLayer, vector]);
            createControls();
            setCenterMap();
            map.zoomTo(currentZoom);
        }
    });
    $("#map #icon-cache").click(function (e) {
        if (!noconnexion) {
            cacheMode = !cacheMode;
            if (cacheMode) {
                document.getElementById('icon-cache').style.opacity=1;
                document.getElementById('icon-flush').style.background="url(/static/images/icon-flush.png)";
                currentLonLat = map.getCenter();
                initViewer();
                updateGeoportalLayers();
                map.addLayers([userLayer, vector]);
                createControls();
                setCenterMap();
                map.zoomTo(currentZoom);
            } else {
                document.getElementById('icon-cache').style.opacity=0.5;
            }
        }
    });
    $("#map #icon-flush").click(function (e) {
        if (!cacheMode) {
            clearDB();
            initDB();
            document.getElementById('icon-flush').style.background="url(/static/images/icon-flushed.png)";
        }
    });
    $("#map #icon-zoom-in").click(function (e) {
        zoomIn();
    });
    $("#map #icon-zoom-out").click(function (e) {
        zoomOut();
    });
    $("#layerapply").click(function (e) {
        currentLonLat = map.getCenter();
        //currentZoom = map.getZoom();
        initViewer();
        updateGeoportalLayers();
        map.addLayers([userLayer, vector]);
        createControls();
        setCenterMap();
        map.zoomTo(currentZoom);
        jQT.goTo('#map', 'slide');
    });
    $('#map #to-object-list').click(function (e) {
        console.log("DEBUG : to-object-list");
        jQT.goTo('#object-list', 'slide');
        return false;
    });
    $('#map #back').click(function (e) {
        jQT.goTo('#loading-page');
        signature++;
        document.getElementById("loading-page").innerHTML+="<br>Initialisation de la synchronisation...";
        synchronizeTo(function () {
            document.getElementById("loading-page").innerHTML+="<br>Fin de la synchronisation...<br>Chargement des cartes...";
            localObjectList = [];
            handleMap();
        });
        return false;
    });
    $('#map-edit #back').click(function (e) {
        jQT.goTo('#loading-page');
        handleMap();
        return false;
    });
    $('#point-edit #back').click(function (e) {
        jQT.goTo('#map', 'slide');
        return false;
    });
    $('#layer-list #back').click(function (e) {
        currentLonLat = map.getCenter();
        currentZoom = map.getZoom();
        initViewer();
        updateGeoportalLayers();
        map.addLayers([userLayer, vector]);
        createControls();
        setCenterMap();
        map.zoomTo(currentZoom);
        jQT.goTo('#map', 'slide');
        return false;
    });
    $('#permission-list #back').click(function (e) {
        jQT.goTo('#loading-page');
        handleMap();
        return false;
    });
    $("#object-list #back").click(
    function (e) {
        jQT.goTo('#loading-page');
        signature++;
        document.getElementById("loading-page").innerHTML+="<br>Initialisation de la synchronisation...";
        synchronizeTo(function () {
            document.getElementById("loading-page").innerHTML+="<br>Fin de la synchronisation...<br>Chargement des cartes...";
            localObjectList = [];
            handleMap();
        });
        return false;
    });
    $('#object-edit #back').click(function (e) {
        jQT.goTo('#object-list', 'slide');
        return false;
    });
    $('#map-list #back').click(function (e) {
        window.localStorage.clear();
        jQT.goTo('#loading', 'slide');
        return false;
    });
    $('#map-create').click(function (e) {
        mapindex = 0;
        jQT.goTo('#map-edit', 'slide');
    });
    $('#object-create').click(function (e) {
        objectindex = 0;
        jQT.goTo('#object-edit', 'slide');
    });
    $('#map-edit').bind('pageAnimationEnd', function (event, info) {
        if (info.direction == 'in') {
            $('#map-name').attr('value', "");
            $('#map-description').attr('value', "");
        }
    });
    $('#object-edit').bind('pageAnimationEnd', function (event, info) {
        if (info.direction == 'in') {
            if (objectindex == 0) {
                $('#object-name').attr('value', "");
                $('#object-category').attr('value', "");
            } else {
                $("input:radio").removeAttr("checked");
                var presetValue = localObjectList[objectindex].category;
                $("input:radio").filter("[value=" + presetValue + "]").attr("checked", "checked");
                $('#object-name').attr('value', localObjectList[objectindex].name);
            }
        }
    });
    $('#point-edit').bind('pageAnimationEnd', function (event, info) {
        if (info.direction == 'in') {
            $('#point-edit #delete').attr('style', 'margin:20px; margin-top:20px;visibility:hidden;');
            if (pointindex == 0) {
                $('#point-name').attr('value', "");
                $('#point-description').attr('value', "");
                $('#point-position').attr('value', "");
            } else {
                $('#point-edit #delete').attr('style', 'margin:20px; margin-top:20px;visibility:visible;');
                $('#point-name').attr('value', localObjectList[objectindex].points[pointindex].name);
                $('#point-description').attr('value', localObjectList[objectindex].points[pointindex].description);
                $('#point-position').attr('value', localObjectList[objectindex].points[pointindex].position);
            }
        }
    });
    $('#map').bind('pageAnimationEnd', function (event, info) {
        if (info.direction == 'in') {
            $(function(){
                startGPS();
            });
        }
    });
    $('#map-edit #save').click(function (e) {
        document.getElementById("loading-page").innerHTML+="<br>Création de la carte...";
        var newName = $("#map-name").val();
        var newDescription = $("#map-description").val();
        jQT.goTo('#loading-page');
        if(mapindex==0) setMap(newName, newDescription, function () {
            goToMap();
        });
        else setMap(newName, newDescription, function () {
            handleMap();
        });
    });
    $('#object-edit #save').click(function (e) {
        var newName = $("#object-name").val();
        if (newName.length == 0) return;
        var newCategory = $("input:radio:checked").val();
        $("#object-category").attr('style', '');
        setObject(newName, newCategory);
        objectList = [objectindex];
        editMode = true;
        buildCurrentObjectList();
        if (currentObjectList.length > 0 && currentObjectList[0].length > 0) currentLonLat = new OpenLayers.LonLat(currentObjectList[0][0].lon, currentObjectList[0][0].lat);
        initViewer();
        updateUserLayer();
        updateGeoportalLayers();
        map.addLayers([userLayer, vector]);
        createControls();
        setCenterMap();
        jQT.goTo('#map', 'slide');
        /*
        $(function(){
            startGPS();
        });
        */
    });
    $('#point-edit #save').click(function (e) {
        var newName = $("#point-name").val();
        var newDescription = $("#point-description").val();
        //var newPosition = $("#point-position").val();
        var newPosition = 0;
        if (pointindex == 0) {
            var newpid = 0;
            for (var i in localObjectList[objectindex].points) {
                newpid = newpid < localObjectList[objectindex].points[i].pid ? localObjectList[objectindex].points[i].pid : newpid;
            }
            newpid++;
            localObjectList[objectindex].points[newpid] = {
                name: newName,
                oid: objectindex,
                pid: newpid,
                description: newDescription,
                longitude: currentLonLat.lon,
                latitude: currentLonLat.lat,
                position: newPosition
            };
        } else {
            localObjectList[objectindex].points[pointindex].name = newName;
            localObjectList[objectindex].points[pointindex].description = newDescription;
            localObjectList[objectindex].points[pointindex].position = newPosition;
        }
        buildCurrentObjectList();
        removeControls();
        map.removeLayer(userLayer);
        map.removeLayer(vector);
        updateUserLayer();
        map.addLayers([userLayer, vector]);
        createControls();
        jQT.goTo('#map', 'slide');
    });
    $("#point-edit #delete").click(function (e) {
        delete localObjectList[objectindex].points[pointindex];
        buildCurrentObjectList();
        removeControls();
        map.removeLayer(userLayer);
        map.removeLayer(vector);
        updateUserLayer();
        map.addLayers([userLayer, vector]);
        createControls();
        jQT.goTo('#map', 'slide');
    });
    $('#permission-list #save').click(function (e) {
        jQT.goTo('#loading-page');
        var suname = $("#share-user").val();
        insertShare(suname, function () {
            handleMap();
        })
    });
    $('#newpoint-button').click(function(){
        if (document.getElementById('newpoint-button').disabled==""){
            if (currentGpsCenter){
                currentLonLat = currentGpsCenter;
                pointindex = 0;
                var newpid = 0;
                for (var i in localObjectList[objectindex].points) {
                    newpid = newpid < localObjectList[objectindex].points[i].pid ? localObjectList[objectindex].points[i].pid : newpid;
                }
                newpid++;
                localObjectList[objectindex].points[newpid] = {
                    name: "",
                    oid: objectindex,
                    pid: newpid,
                    description: "",
                    longitude: currentLonLat.lon,
                    latitude: currentLonLat.lat,
                    position: 0
                };
                buildCurrentObjectList();
                console.log("DEBUG currentObjectList : "+currentObjectList[0].length);
                removeControls();
                map.removeLayer(userLayer);
                map.removeLayer(vector);
                updateUserLayer();
                map.addLayers([userLayer, vector]);
                createControls();
            }else{
                alert("Pas de coordonnées GPS");
            }
        }
    });
}

function initViewer() {
    if (!viewer_initialized) {
        viewer = new geoportalLoadviewer("map-view", "mini", "FXX");
        map = viewer.getMap();
        viewer_initialized = true;
    } else {
        removeControls();
        var layersToDestroy = map.getLayersByClass("Geoportal.Layer.WMSC");
        for (var i in layersToDestroy) {
            layer = layersToDestroy[i];
            layer.destroy();
        }
        map.removeLayer(userLayer);
        map.removeLayer(vector);
        viewer_initialized = true;
    }
}

function updateGeoportalLayers() {
    layerList = [];
    getLayersToShow();
    viewer.addGeoportalLayers(layerList, {});
}

function updateUserLayer() {
    userLayer = new OpenLayers.Layer.Vector("USER");
    currentLines = [];
    currentPolygones = [];
    for (var i in currentObjectList) {
        if (currentObjectType[i] == "Zone") buildZone(currentObjectList[i]);
        else if (currentObjectType[i] == "Chemin") buildLine(currentObjectList[i]);
    }
    userLayer.addFeatures(currentLines);
    userLayer.addFeatures(currentPolygones);
    for (var i in currentObjectList) {
        userLayer.addFeatures(currentObjectList[i]);
    }
}

function buildCurrentPointFeat(target, title, pid, oid, lon, lat, pos) {
    var lonlat = new OpenLayers.LonLat(lon, lat);
    var pOL = new OpenLayers.Geometry.Point(lonlat.lon, lonlat.lat);
    var style = {
        fillOpacity: 1,
        pointRadius: 20,
        graphicYOffset: -26,
        graphicWidth: 16,
        graphicHeight: 26,
        externalGraphic: "static/images/pin.png"
    };
    var feat = new OpenLayers.Feature.Vector(pOL, null, style);
    feat.title = title;
    feat.pid = pid;
    feat.oid = oid;
    feat.pos = pos;
    feat.lon = lon;
    feat.lat = lat;
    target.push(feat);
}

function buildCurrentObjectList() {
    currentObjectList = [];
    currentObjectType = [];
    var compt = 0;
    for (var i in objectList) {
        if (objectList[i] != -1) {
            compt++;
            currentObjectList.push([]);
            currentObjectType.push(localObjectList[objectList[i]].category);
            var points = localObjectList[objectList[i]].points;
            for (var j in points) {
                var localPoint = points[j];
                buildCurrentPointFeat(currentObjectList[compt - 1], localPoint.name, localPoint.pid, localPoint.oid, localPoint.longitude, localPoint.latitude, localPoint.position);
            }
        }
    }
}

function setCenterMap() {
    map.setCenter(currentLonLat, currentZoom);
}

function zoomIn() {
    /*
    if (currentZoom >= MAX_ZOOM_LEVEL) {
        return;
    }
    */
    map.zoomTo(++currentZoom);
}

function zoomOut() {
    /*
    if (currentZoom <= MIN_ZOOM_LEVEL) {
        return;
    }
    */
    map.zoomTo(--currentZoom);
}

function buildLine(objectPoints) {
    for (var i = 1; i < objectPoints.length; i++) {
        var lineFeature = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString([objectPoints[i].geometry, objectPoints[i - 1].geometry]), null, {
            strokeColor: "#00FF00",
            strokeWidth: 3
        });
        currentLines.push(lineFeature);
    }
}

function buildZone(objectPoints) {
    var pointsOL = [];
    for (var i in objectPoints) pointsOL.push(objectPoints[i].geometry);
    var linearRing = new OpenLayers.Geometry.LinearRing(pointsOL);
    currentPolygones.push(new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Polygon([linearRing], null, {})));
}

function startGPS(){
    gpsToggle = true;
    $("#gps-state").html("Acquisition des données GPS");
    vector.removeAllFeatures();
    geolocate.deactivate();
    geolocate.watch = true;
    firstGeolocation = true;
    geolocate.activate();
    $("#gps-button").attr('style', 'left:5px;width:30px;opacity:0.5;');
}

function createControls() {
    if (editMode) {
        document.getElementById("newpoint-button").style.display='block';
        document.getElementById("newpoint-button").disabled="";
        OpenLayers.Control.Click = OpenLayers.Class(OpenLayers.Control, {
            defaultHandlerOptions: {
                'single': true,
                'double': false,
                'pixelTolerance': 0,
                'stopSingle': false,
                'stopDouble': false
            },
            initialize: function (options) {
                OpenLayers.Control.prototype.initialize.apply(this, arguments);
                this.handlerOptions = OpenLayers.Util.extend({}, this.defaultHandlerOptions);
                this.handler = new OpenLayers.Handler.Click(
                this, {
                    'click': this.trigger
                }, this.handlerOptions);
            },
            trigger: function (e) {
                var lonlat = this.map.getLonLatFromViewPortPx(e.xy).transform();
                pointindex = 0;
////////////////////////////////////////////////////////////////////////
                //jQT.goTo("#point-edit");
                currentLonLat = new OpenLayers.LonLat(lonlat.lon, lonlat.lat);
                console.log("CurrentLontLat : "+ currentLonLat);
                var newpid = 0;
                for (var i in localObjectList[objectindex].points) {
                    newpid = newpid < localObjectList[objectindex].points[i].pid ? localObjectList[objectindex].points[i].pid : newpid;
                }
                newpid++;
                localObjectList[objectindex].points[newpid] = {
                    name: "",
                    oid: objectindex,
                    pid: newpid,
                    description: "",
                    longitude: currentLonLat.lon,
                    latitude: currentLonLat.lat,
                    position: 0
                };
                buildCurrentObjectList();
                console.log("DEBUG currentObjectList : "+currentObjectList[0].length);
                removeControls();
                map.removeLayer(userLayer);
                map.removeLayer(vector);
                updateUserLayer();
                map.addLayers([userLayer, vector]);
                createControls();
////////////////////////////////////////////////////////////////////////
            }
        });
        addPointControl = new OpenLayers.Control.Click();
        map.addControl(addPointControl);
        addPointControl.activate();
/*var touchNav = new OpenLayers.Control.TouchNavigation({
                dragPanOptions: {
                    enableKinetic: true
                }
            })
    map.addControl(touchNav);
    touchNav.activate();
    var pinchZoom = new OpenLayers.Control.PinchZoom()
    map.addControl(pinchZoom);
    pinchZoom.activate();*/
        selectControl = new OpenLayers.Control.SelectFeature(userLayer, {
            onSelect: function (feature) {
                console.log("DEBUG SelectFeature : "+feature.geometry.toString().substring(0,5));
                if (feature.geometry.toString().substring(0,5)=="POINT"){
                    pointindex = feature.pid;
                    objectindex = feature.oid;
                    jQT.goTo("#point-edit");
                }
            }
        });
        selectControl.clickout = true;
        selectControl.toggle = true;
        map.addControl(selectControl);
        selectControl.activate();
    }else{
        document.getElementById("newpoint-button").style.display='none';
        document.getElementById("newpoint-button").disabled="disabled";
        ////////////Control Features out of edit mode//////////////////
        selectControl = new OpenLayers.Control.SelectFeature(userLayer, {
            onSelect: function (feature) {
                if (feature.geometry.toString().substring(0,5)=="POINT"){
                    var nom = localObjectList[feature.oid].points[feature.pid].name;
                    var description = localObjectList[feature.oid].points[feature.pid].description;
                    console.log("DEBUG nom : "+nom+" description : "+description);
                    feature.popup = new OpenLayers.Popup.FramedCloud("Popup", feature.geometry.getBounds().getCenterLonLat(), null, "<div style='font-size:.8em;'> <center><h1>"+nom+"</h1><br>"+description+"</center></div>", null, true, function (evt) { selectControl.unselect( feature ) ; });
                    map.addPopup(feature.popup);
                    document.getElementById("Popup_contentDiv").style.zIndex=200;
                    console.log("DEBUG popup : "+document.getElementById("Popup_contentDiv").style);
                }
            },
            onUnselect: function (feature) {
                console.log("DEBUG unSelect "+feature);
                if (feature.geometry.toString().substring(0,5)=="POINT"){
                    map.removePopup(feature.popup);
                    feature.popup.destroy();
                    feature.popup = null;
                }
            }
        });
        selectControl.clickout = true;
        selectControl.toggle = true;
        map.addControl(selectControl);
        selectControl.activate();
        ///////////////////////////////////////////////////////////////
    }
    geolocate = new OpenLayers.Control.Geolocate({
        bind: false,
        geolocationOptions: {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 7000
        }
    });
    geolocate.events.register("locationupdated", geolocate, function (e) {
        $("#gps-state").html("");
        currentGpsCenter=e.center;
        vector.removeAllFeatures();
        var circle = new OpenLayers.Feature.Vector(
        OpenLayers.Geometry.Polygon.createRegularPolygon(
        new OpenLayers.Geometry.Point(e.point.x, e.point.y), e.position.coords.accuracy / 2, 40, 0), {}, {
            fillColor: '#000',
            fillOpacity: 0.1,
            strokeWidth: 0
        });
        vector.addFeatures([
        new OpenLayers.Feature.Vector(
        e.point, {}, {
            graphicName: 'cross',
            strokeColor: '#f00',
            strokeWidth: 2,
            fillOpacity: 0,
            pointRadius: 10
        }), circle]);
        if (firstGeolocation) {
            map.zoomToExtent(vector.getDataExtent());
            map.setCenter(e.center, 16);
            console.log("DEBUG firstGeolocation : lon "+e.center.lon+" lat "+e.center.lat);
            pulsate(circle);
            firstGeolocation = false;
            this.bind = true;
        }
    });
    geolocate.events.register("locationfailed", this, function (error) {
        $("#gps-button").attr('style', 'left:5px;width:30px;opacity:1;');
        gpsToggle=false;
        $("#gps-state").html(error.error.message);
    });
    map.addControl(geolocate);
}

function removeControls() {
    if (map.controls.indexOf(selectControl) != -1) {
        map.removeControl(selectControl);
        selectControl.destroy();
        var popupList = map.popups
        for (var p in popupList) {
            map.removePopup(popupList[p]);
        }
    }
    if (map.controls.indexOf(addPointControl) != -1) {
        map.removeControl(addPointControl);
        addPointControl.destroy();
    }
    if (map.controls.indexOf(geolocate) != -1) {
        map.removeControl(geolocate);
        geolocate.destroy();
    }
}

function getObjectsToShow() {
    objectList = $('input[id^="checkbox"]').map(function () {
        if ($(this).attr("checked") == true) return $(this).attr('id').substring(8);
        else return "-1";
    }).get();
}

function getLayersToShow() {
    layerList = [];
    $('input[id^="geolayer"]').map(function () {
        if ($(this).attr("checked")) layerList.push(layers[parseInt($(this).attr('id').substring(8))].label);
        console.log("DEBUG : layerList")
        for (var l in layerList) console.log("DEBUG : layer : "+layerList[l])
        return;
    });
}

function setObject(newName, newCategory) {
    if (objectindex == 0) {
        var newoid = 0;
        for (var i in localObjectList) {
            newoid = newoid < localObjectList[i].oid ? localObjectList[i].oid : newoid;
        }
        newoid++;
        localObjectList[newoid] = {
            name: newName,
            mid: mapindex,
            oid: newoid,
            category: newCategory,
            lock: true,
            points: []
        };
        objectindex = newoid;
    } else {
        localObjectList[objectindex].name = newName;
        localObjectList[objectindex].category = newCategory;
    }
}

function synchronizeFrom(boucle) {
    localObjectList = [];
    return getObjectListFromRemoteDB(signature, function () {
        getAllObjectDescriptions(signature, boucle);
    });
}

function setMap(newName, newDescription, boucle) {
    $(function () {
        document.getElementById("loading-page").innerHTML+="<br>Synchronisation en cours...";
        $.get(server + "/setMap/" + mapindex + "&" + Base64.encode(newName) + "&" + Base64.encode(newDescription), function (data) {
            if (data) {
                document.getElementById("loading-page").innerHTML+=" "+data;
                if (data == "success") boucle();
                var res = data.split("_");
                if (res[0] == "insert") {
                    mapindex = parseInt(res[1]);
                    insertShare(utilisateur, boucle);
                } else return;
            }
        });
    });
}

function startSync(sig, boucle) {
    sync = false;
    $(function () {
        $.get(server + "/startSync/" + sig, function (data) {
            if (data) {
                if (data == "success") boucle();
                else sync = true;
            }
        });
    });
}

function stopSync(sig, boucle) {
    $(function () {
        $.get(server + "/stopSync/" + sig, function (data) {
            if (data) {
                if (data == "success") {
                    sync = true;
                    boucle();
                } else sync = false;
            }
        });
    });
}

function getObjectDescription(sig, i, next, boucle) {
    document.getElementById("loading-page").innerHTML+="<br>Chargement du tracé " + i +"...";
    $(function () {
        $.get(server + "/getObjectDescription/" + sig + "&" + i, function (data) {
            if (data) {
                var res = data.split('_');
                if (res[0] == "empty" && res[1] == sig) {
                    localObjectList[i] = {
                        mid: res[2],
                        oid: res[3],
                        name: Base64.decode(res[4]),
                        category: res[5],
                        lock: res[6],
                        points: []
                    };
                    if (next.length == 0) {
                        stopSync(sig, boucle);
                        return;
                    }
                    return getObjectDescription(sig, next[0], next.slice(1), boucle);
                }
                if (parseInt(res[0]) == sig) {
                    var tail = res[6];
                    var points = tail.split('+');
                    var localPointList = [];
                    for (p in points) {
                        var temp = points[p].split(',');
                        localPointList[temp[0]] = {
                            oid: res[2],
                            pid: temp[0],
                            name: Base64.decode(temp[1]),
                            description: Base64.decode(temp[2]),
                            longitude: temp[3],
                            latitude: temp[4],
                            position: temp[5]
                        };
                    }
                    localObjectList[i] = {
                        mid: res[1],
                        oid: res[2],
                        name: Base64.decode(res[3]),
                        category: res[4],
                        lock: res[5],
                        points: localPointList
                    };
                }
                if (next.length == 0) {
                    stopSync(sig, boucle);
                    return;
                }
                getObjectDescription(sig, next[0], next.slice(1), boucle);
            }
        });
    });
}

function getObjectListFromRemoteDB(sig, boucle) {
    if (mapindex) {
        $(function () {
            document.getElementById("loading-page").innerHTML+="<br>Chargement de la liste des objets...";
            $.get(server + "/getObjectList/" + mapindex, function (data) {
                if (data) {
                    if (data == "empty") return boucle();
                    res = data.split('_');
                    if (res.length > 0) {
                        objectList = res;
                        boucle();
                    }
                }
            });
        });
    } else {
        return;
    }
}

function getAllObjectDescriptions(sig, boucle) {
    if (objectList.length > 0) {
        startSync(signature, function () {
            getObjectDescription(sig, objectList[0], objectList.splice(1), function () {
                boucle();
            })
        });
    } else {
        return boucle();
    }
}

function synchronizeTo(boucle) {
    setObjectListToRemoteDB(function () {
        boucle();
    });
}

function setObjectListToRemoteDB(boucle) {
    document.getElementById("loading-page").innerHTML+="<br>Suppression des données obsolètes....";
    $(function() {
        $.get(server + "/deleteObjects/" + mapindex, function (data) {
            if (data) {
                document.getElementById("loading-page").innerHTML+="<br>"+data;
                if (data=="success"){
                    var listInds = [];
                    for (i in localObjectList) listInds.push(i);
                    addObjectToRemoteDB(listInds[0], listInds.splice(1), function () {
                            boucle();
                    });
                }
            }
        });
    });
}

function addObjectToRemoteDB(current, next, boucle) {
    if (!current) return boucle();
    document.getElementById("loading-page").innerHTML+="<br>Synchronisation de : "+localObjectList[current].name+"...";
    $(function () {
        $.get(server + "/setObject/0&0&" + localObjectList[current].mid + "&" + Base64.encode(localObjectList[current].name) + "&" + localObjectList[current].category, function (data) {
            if (data) {
                document.getElementById("loading-page").innerHTML+="<br>"+data;
				data=data.split("_");
			    if (data[0] == "insert") {
                    var newCallback = function () {
                            return boucle();
                        };
                    if (next.length > 0) newCallback = function () {
                        return addObjectToRemoteDB(next[0], next.splice(1), boucle);
                    };
                    if (localObjectList[current].points.length == 0) newCallback();
                    else {
                        var points = localObjectList[current].points;
                        var listInds = [];
                        for (i in localObjectList[current].points) listInds.push(i);
                        addPointToRemoteDB(data[1], points, listInds[0], listInds.splice(1), newCallback);
                    }
                }
            }
        });
    });
}

function addPointToRemoteDB(oid, points, current, next, boucle) {
    if (!current) return;
    current = points[current];
    document.getElementById("loading-page").innerHTML+="<br>Synchronisation du point : "+current.name+"...";
    $(function () {
        $.get(server + "/setPoint/0&0&" + oid + "&" + Base64.encode(current.name) + "&" + Base64.encode(current.description) + "&" + current.longitude + "&" + current.latitude + "&" + current.position, function (data) {
            if (data) {
                document.getElementById("loading-page").innerHTML+="<br>"+data;
                if (data == "success") {
                    if (next.length == 0) boucle();
                    else {
                        addPointToRemoteDB(oid, points, next[0], next.splice(1), boucle);
                    }
                }
            }
        });
    });
}

var Base64 = {
 
	// private property
	_keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789(%)",
 
	// public method for encoding
	encode : function (input) {
		var output = "";
		var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
		var i = 0;
 
		input = Base64._utf8_encode(input);
 
		while (i < input.length) {
 
			chr1 = input.charCodeAt(i++);
			chr2 = input.charCodeAt(i++);
			chr3 = input.charCodeAt(i++);
 
			enc1 = chr1 >> 2;
			enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
			enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
			enc4 = chr3 & 63;
 
			if (isNaN(chr2)) {
				enc3 = enc4 = 64;
			} else if (isNaN(chr3)) {
				enc4 = 64;
			}
 
			output = output +
			this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) +
			this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);
 
		}
 
		return output;
	},
 
	// public method for decoding
	decode : function (input) {
		var output = "";
		var chr1, chr2, chr3;
		var enc1, enc2, enc3, enc4;
		var i = 0;
 
		input = input.replace(/[^A-Za-z0-9()%]/g, "");
 
		while (i < input.length) {
 
			enc1 = this._keyStr.indexOf(input.charAt(i++));
			enc2 = this._keyStr.indexOf(input.charAt(i++));
			enc3 = this._keyStr.indexOf(input.charAt(i++));
			enc4 = this._keyStr.indexOf(input.charAt(i++));
 
			chr1 = (enc1 << 2) | (enc2 >> 4);
			chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
			chr3 = ((enc3 & 3) << 6) | enc4;
 
			output = output + String.fromCharCode(chr1);
 
			if (enc3 != 64) {
				output = output + String.fromCharCode(chr2);
			}
			if (enc4 != 64) {
				output = output + String.fromCharCode(chr3);
			}
 
		}
 
		output = Base64._utf8_decode(output);
 
		return output;
 
	},
 
	// private method for UTF-8 encoding
	_utf8_encode : function (string) {
		string = string.replace(/\r\n/g,"\n");
		var utftext = "";
 
		for (var n = 0; n < string.length; n++) {
 
			var c = string.charCodeAt(n);
 
			if (c < 128) {
				utftext += String.fromCharCode(c);
			}
			else if((c > 127) && (c < 2048)) {
				utftext += String.fromCharCode((c >> 6) | 192);
				utftext += String.fromCharCode((c & 63) | 128);
			}
			else {
				utftext += String.fromCharCode((c >> 12) | 224);
				utftext += String.fromCharCode(((c >> 6) & 63) | 128);
				utftext += String.fromCharCode((c & 63) | 128);
			}
 
		}
 
		return utftext;
	},
 
	// private method for UTF-8 decoding
	_utf8_decode : function (utftext) {
		var string = "";
		var i = 0;
		var c = c1 = c2 = 0;
 
		while ( i < utftext.length ) {
 
			c = utftext.charCodeAt(i);
 
			if (c < 128) {
				string += String.fromCharCode(c);
				i++;
			}
			else if((c > 191) && (c < 224)) {
				c2 = utftext.charCodeAt(i+1);
				string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
				i += 2;
			}
			else {
				c2 = utftext.charCodeAt(i+1);
				c3 = utftext.charCodeAt(i+2);
				string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
				i += 3;
			}
 
		}
 
		return string;
	}
 
}
