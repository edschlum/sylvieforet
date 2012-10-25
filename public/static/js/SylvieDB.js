db = null;
name = 'sylvieforet';
version = '1';
description = 'sylvieforet';
size = 2 * 1024 * 1024;
MAX = 50;
db = window.openDatabase(name, version, description, size);

var resDB = null;

function initDB() {
    db.transaction(

    function (tx) {
        tx.executeSql("Create table if not exists SFImage (key unique, value) ", [], function (tx, result) {
            return true;
        }, function (tx, error) {
            return false;
        });
    });
}

function setDB(key, value) {
    db.transaction(

    function (tx) {
        tx.executeSql("Insert into SFImage (key, value) values (?,?)", [key, value], function (tx, result) {
            return true;
        }, function (tx, error) {
            return false;
        });
    });
}

function getDB(key, boucle) {
    db.transaction(
    function (tx) {
        tx.executeSql("Select value from SFImage where key=?", [key], function (tx, result) {
            resDB = null;
            if (result.rows.length) {
                resDB = result.rows.item(0).value;
            }
            boucle();
        }, function (tx, error) {
            return;
        });
    });
}

function clearDB() {
    db.transaction(

    function (tx) {
        tx.executeSql("Drop table if exists SFImage", [], function (tx, result) {
            return true;
        }, function (tx, error) {
            return false;
        });
    });
}

function countDB() {
    db.transaction(

    function (tx) {
        tx.executeSql("Select count(*) as count from SFImage", [], function (tx, result) {
            return result.rows.item(0)['count'];
        }, function (tx, error) {
            return 0;
        });
    });
}

function getKey(url) {
    var res = url.split(/.+BBOX=(.+)&WIDTH=(.+)&HEIGHT=(.+)&TILED(.+)/);
    return res.splice(1, 3).join('+');
}

function getGpp(url) {
    var res = url.split(/.+&gppkey=(.+)/);
    return res[1];
}

function retarget(img, data) {
    img.url = "data:image/jpeg;base64," + data;
    img.imgDiv.src = img.url;
    data = null;
}

function setImage(img) {
    if (!noconnexion && !cacheMode) {
        img.imgDiv.src = img.url;
    }
    else {
        img.imgDiv.src="/static/images/checker.gif";
        var key = getKey(img.url);
        getDB(key, function() {
            if (!noconnexion && cacheMode) {
                if (!resDB) {
                    $(function () {
                        $.get(server + "/getB64/" + img.url, function (data) {
                            if (data) {
                                setDB(key, data);
                                retarget(img, data);
                            }
                        });
                    });
                } else {
                    retarget(img, resDB);
                }
            }
            else if (noconnexion) {
                if (resDB) retarget(img, resDB);
            }
        });
    }
}
