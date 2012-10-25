from django.contrib import auth
from django.db.models import Count
from django.http import HttpResponseRedirect
from django.http import HttpResponse
from django.shortcuts import render_to_response, get_object_or_404
from django.template import Context, loader

from django.contrib.auth.models import User
from models import Map
from models import Object
from models import Point
from models import SylvieUser
from models import Share

from urllib import urlencode
from urllib2 import urlopen, URLError, Request
from base64 import b64encode

import re, sys, traceback

from string import replace

def success():
    return HttpResponse("success")

def failure():
    return HttpResponse("failure")

def empty():
    return HttpResponse("empty")

def index(request):
    t = loader.get_template('index.html')
    c = Context({}) 
    return HttpResponse(t.render(c))

def getB64(request, url):
    baseUrl = "http://wxs.ign.fr/geoportail/wmsc"
    try:
        values = {
            'BBOX' : request.GET.get('BBOX'),
            'EXCEPTIONS' : request.GET.get('EXCEPTIONS'),
            'FORMAT' : request.GET.get('FORMAT'),
            'HEIGHT' : request.GET.get('HEIGHT'),
            'LAYERS' : request.GET.get('LAYERS'),
            'REQUEST' : request.GET.get('REQUEST'),
            'SERVICE' : request.GET.get('SERVICE'),
            'SRS' : request.GET.get('SRS'),
            'STYLES' : request.GET.get('STYLES'),
            'TILED' : request.GET.get('TILED'),
            'VERSION' : request.GET.get('VERSION'),
            'WIDTH' : request.GET.get('WIDTH'),
            'gppkey' : request.GET.get('gppkey'),
        }
        param = urlencode(values)
        headers = {
            'Host': 'wxs.ign.fr',
            'User-Agent' : 'Mozilla/5.0 (X11; Linux i686; rv:5.0) Gecko/20100101 Firefox/5.0',
            'Accept' : 'image/png,image/*;q=0.8,*/*;q=0.5',
            'Accept-Language' : 'en-us,en;q=0.5',
            'Accept-Encoding' : 'gzip, deflate',
            'Accept-Charset' : 'ISO-8859-1,utf-8;q=0.7,*;q=0.7',
            'Connection' : 'keep-alive',
            'Referer' : 'http://sylvie.alwaysdata.net',
        }
        req = Request(baseUrl, param, headers)
        response = urlopen(req)
        data = response.read()
        return HttpResponse(b64encode(data))
    except Exception, e:
        return HttpResponse(str(e))
    return failure()

def login(request, username, password):
    user = auth.authenticate(username=username, password=password)
    if user is not None and user.is_active:
        auth.login(request, user)
        su = SylvieUser.objects.get(user=request.user)
        su.sig = -1
        su.save()
        return success()
    else:
        return failure()

def logout(request):
    auth.logout(request)
    return success()

def startSync(request, signature):
    if request.user.is_authenticated():
        su = SylvieUser.objects.get(user=request.user)
        if su.sig == -1 :
            su.sig = signature
            su.save()
            return success()
    return failure()

def stopSync(request, signature):
    if request.user.is_authenticated():
        su = SylvieUser.objects.get(user=request.user)
        if (su.sig == int(signature)) :
            su.sig = -1
            su.save()
            return success()
    return failure()

def getMapList(request):
    if request.user.is_authenticated():
        if Share.objects.filter(suid=request.user.id).count() > 0:
            return HttpResponse(reduce(lambda x, y: x+'_'+y, map(lambda x: str(x.mid.mid), Share.objects.filter(suid=request.user.id))))
        else:
            return empty()
    return failure()

def getMap(request, signature, mid):
    if request.user.is_authenticated():
        if Share.objects.filter(suid=request.user.id).filter(mid=mid).count() > 0:
            return HttpResponse(signature+'_'+str(Map.objects.get(mid=mid).mid)+'_'+str(Map.objects.get(mid=mid).name)+'_'+str(Map.objects.get(mid=mid).description))
        return failure()
    return failure()

def getObjectList(request, mid):
    if request.user.is_authenticated():
        if Object.objects.filter(mid=mid).count() > 0:
            return HttpResponse(reduce(lambda x, y: x+'_'+y, map(lambda x: str(x.oid), Object.objects.filter(mid=mid))))
        return empty()
    return failure()

def getObject(request, signature, mid, oid):
    if request.user.is_authenticated():
        if Share.objects.filter(suid=request.user.id).filter(mid=mid).count() > 0:
            return HttpResponse(signature+'_'+str(Object.objects.filter(mid=mid).get(oid=oid).oid)+'_'+str(Object.objects.filter(mid=mid).get(oid=oid).category)+'_'+str(Object.objects.filter(mid=mid).get(oid=oid).name))
        return failure()
    return failure()

def getObjectPoints(request, signature, oid):
    if request.user.is_authenticated():
        category = Object.objects.get(oid=oid).category
        tail = reduce(lambda x, y: x+'+'+y, map(lambda x: str(x.longitude)+','+str(x.latitude)+','+str(x.accuracy)+','+str(oid)+','+str(x.index), Point.objects.filter(oid=oid)))
        return HttpResponse(signature+'_'+category+'_'+tail)
    return failure()

def getObjectDescription(request, signature, oid):
    if request.user.is_authenticated():
        o = Object.objects.get(oid=oid)
        mid = str(o.mid.mid)
        oidStr = str(o.oid)
        name = str(o.name)
        category = str(o.category)
        lock = str(o.lock)
        if Point.objects.filter(oid=oid).count() > 0:
            tail = reduce(lambda x, y: x+'+'+y, map(lambda x: str(x.pid)+','+str(x.name)+','+str(x.description)+','+str(x.longitude)+','+str(x.latitude)+','+str(x.index), Point.objects.filter(oid=oid)))
            return HttpResponse(signature+'_'+mid+'_'+oidStr+'_'+name+'_'+category+'_'+lock+'_'+tail)
        return HttpResponse("empty_"+signature+'_'+mid+'_'+oidStr+'_'+name+'_'+category+'_'+lock)
    return failure()

def getShareList(request, mid):
    if request.user.is_authenticated():
        if Share.objects.filter(mid=mid).count() > 0:
            return HttpResponse(reduce(lambda x, y: x+'_'+y, map(lambda x: str(x.sid), Share.objects.filter(mid=mid))))
    return empty()
    return failure()

def getShare(request, signature, mid, sid):
    if request.user.is_authenticated():
        if Share.objects.filter(suid=request.user.id).filter(mid=mid).count() > 0:
            return HttpResponse(signature+'_'+str(Share.objects.filter(mid=mid).get(sid=sid).sid)+'_'+str(SylvieUser.objects.get(user=(Share.objects.filter(mid=mid).get(sid=sid).suid.user)).user.username))
        return failure()
    return failure()

def insertShare(request, mid, suname):
    if request.user.is_authenticated():
        try :
            tempUser = User.objects.get(username=suname)
            su = SylvieUser.objects.get(user=tempUser)
            m = Map.objects.get(mid=mid)
            s = Share(mid=m, suid=su)
            s.save()
            return success()
        except:
            return failure()
    return failure()

def setMap(request, mid, name, description):
    if request.user.is_authenticated():
        try :
            newName = replace(name, "_", " ")
            newDescription = replace(description, "_", " ")
            if int(mid) > 0:
                m = Map.objects.get(mid=mid)
                m.name = newName
                m.description = newDescription
                m.save()
                return success()
            else:
                m = Map(description=newDescription, name=newName)
                m.save()
                return HttpResponse("insert_"+str(m.mid))
        except:
            return HttpResponse("Erreur "+traceback.format_exc())
    return failure()

def deleteMap(request, mid):
    if request.user.is_authenticated():
        try :
            m = Map.objects.get(mid=mid)
            m.delete()
            return success()
        except:
            return empty()
    return failure()

def setObject(request, flag, oid, mid, name, category):
    if request.user.is_authenticated():
        try:
            newName = replace(name, "_", " ")
            newCategory = replace(category, "_", " ")
            newMid = int(mid)
            o = Object(category=newCategory, name=newName, mid=Map.objects.get(mid=newMid), lock=False)
            o.save()
            #return success()
            return HttpResponse("insert_"+str(o.oid))
        except:
            return empty()
    return failure()

def setPoint(request, flag, pid, oid, name, description, longitude, latitude, index):
    if request.user.is_authenticated():
        try :
            newOid = int(oid)
            newName = replace(name, "_", " ")
            newDescription = replace(description, "_", " ")
            newIndex = int(index)
            p = Point(oid=Object.objects.get(oid=newOid), name=newName, description=newDescription, index=newIndex, longitude=longitude, latitude=latitude)
            p.save()
            return success()
            #return HttpResponse("insert_"+str(o.oid))
        except :
            return HttpResponse("Erreur "+traceback.format_exc())
    return failure()

def deleteObjects(request, mid):
	if request.user.is_authenticated():
		try :
			ol = Object.objects.filter(mid=mid)
			for o in ol:
				Point.objects.filter(oid=o.oid).delete()
				o.delete()
			return success()
		except:
			return HttpResponse("Erreur "+traceback.format_exc())
	return failure()

"""	
def setObject(request, flag, oid, mid, name, category):
    if request.user.is_authenticated():
        try:
            newName = replace(name, "_", " ")
            newCategory = replace(category, "_", " ")
            newMid = int(mid)
            if int(oid) > 0:
                o = Object.objects.get(oid=oid)
                o.name = newName
                o.category = newCategory
                o.save()
                return success()
            else:
                o = Object(category=newCategory, name=newName, mid=Map.objects.get(mid=newMid), lock=False)
                o.save()
                #return success()
                return HttpResponse("insert_"+str(o.oid))
        except:
            return empty()
    return failure()

def setPoint(request, flag, pid, oid, name, description, longitude, latitude, index):
    if request.user.is_authenticated():
        try :
            newOid = int(oid)
            newName = replace(name, "_", " ")
            newDescription = replace(description, "_", " ")
            newIndex = int(index)
            if int(pid) > 0:
                p = Point.objects.get(pid=pid)
                p.oid = newOid
                p.longitude = longitude
                p.latitude = latitude
                p.name = newName
                p.description = newDescription
                p.index = newIndex
                p.save()
                return success()
            else:
                p = Point(oid=Object.objects.get(oid=newOid), name=newName, description=newDescription, index=newIndex, longitude=longitude, latitude=latitude)
                p.save()
                return success()
                #return HttpResponse("insert_"+str(o.oid))
        except :
            return HttpResponse("Erreur "+traceback.format_exc())
    return failure()



def lockObject(request, oid):
    if request.user.is_authenticated():
        try :
            o = Object.objects.get(oid=oid)
            o.lock = True
            return success()
        except:
            return empty()
    return failure() 

def unlockObject(request, oid):
    if request.user.is_authenticated():
        try :
            o = Object.objects.get(oid=oid)
            o.lock = False
            return success()
        except:
            return empty()
    return failure()  

def isLocked(request, oid):
    if request.user.is_authenticated():
        try :
            o = Object.objects.get(oid=oid)
            return HttpResponse(o.lock)
        except:
            return empty()
    return failure()  

def getMapVersion(request):
    if request.user.is_authenticated():
        return HttpResponse(str(Map.objects.count()))
    return failure()

def getObjectsCount(request, mid):
    try :
        if request.user.is_authenticated():
            return HttpResponse(str(Object.objects.filter(mid=mid).count()))
        return failure()
    except:
        return failure()
"""

