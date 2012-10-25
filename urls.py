from django.conf.urls.defaults import *

from sylvieforet.settings import MEDIA_ROOT, MEDIA_URL

# Uncomment the next two lines to enable the admin:
from django.contrib import admin
admin.autodiscover()

urlpatterns = patterns('',
    (r'^admin/doc/', include('django.contrib.admindocs.urls')),
    (r'^admin/', include(admin.site.urls)),

    (r'^favicon\.ico$', 'django.views.generic.simple.redirect_to', {'url': '/static/favicon.ico'}),
    (r'^static/(?P<path>.*)$', 'django.views.static.serve',
        {'document_root': '/home/mageri/Public/Work/Sylvie/sylvieforet/static'}),
    (r'^getB64/(?P<url>.*)/$', 'sylvieforet.cartes.views.getB64'),

    (r'^$', 'sylvieforet.cartes.views.index'),

    (r'^login/(?P<username>[a-zA-z0-9]+)&(?P<password>[a-zA-Z0-9]+)/', 'sylvieforet.cartes.views.login'),
    (r'^logout/', 'sylvieforet.cartes.views.logout'),

    (r'^getMapList/', 'sylvieforet.cartes.views.getMapList'),
    (r'^getMap/(?P<signature>\d+)&(?P<mid>\d+)/', 'sylvieforet.cartes.views.getMap'),

    (r'^getObjectList/(?P<mid>\d+)/', 'sylvieforet.cartes.views.getObjectList'),
    (r'^getObject/(?P<signature>\d+)&(?P<mid>\d+)&(?P<oid>\d+)/', 'sylvieforet.cartes.views.getObject'),

    (r'^getShareList/(?P<mid>\d+)/', 'sylvieforet.cartes.views.getShareList'),
    (r'^getShare/(?P<signature>\d+)&(?P<mid>\d+)&(?P<sid>\d+)', 'sylvieforet.cartes.views.getShare'),

    (r'^getObjectPoints/(?P<signature>\d+)&(?P<oid>\d+)', 'sylvieforet.cartes.views.getObjectPoints'),
    (r'^getObjectDescription/(?P<signature>\d+)&(?P<oid>\d+)', 'sylvieforet.cartes.views.getObjectDescription'),
    (r'^getObjectPoints/(?P<signature>\d+)&(?P<oid>\d+)', 'sylvieforet.cartes.views.getObjectPoints'),

    (r'^startSync/(?P<signature>\d+)/', 'sylvieforet.cartes.views.startSync'),
    (r'^stopSync/(?P<signature>\d+)/', 'sylvieforet.cartes.views.stopSync'),

    (r'^insertShare/(?P<mid>\d+)&(?P<suname>[a-zA-z0-9]+)', 'sylvieforet.cartes.views.insertShare'),

    (r'^setMap/(?P<mid>\d+)&(?P<name>[a-zA-z0-9()%]*)&(?P<description>[a-zA-z0-9()%]*)', 'sylvieforet.cartes.views.setMap'),
    (r'^deleteMap/(?P<mid>\d+)/', 'sylvieforet.cartes.views.deleteMap'),

    (r'^setObject/(?P<flag>[0-1])&(?P<oid>\d+)&(?P<mid>\d+)&(?P<name>[a-zA-z0-9()%]*)&(?P<category>[a-zA-z0-9_]*)', 'sylvieforet.cartes.views.setObject'),
    (r'^setPoint/(?P<flag>[0-1])&(?P<pid>\d+)&(?P<oid>\d+)&(?P<name>[a-zA-z0-9()%]*)&(?P<description>[a-zA-z0-9()%]*)&(?P<longitude>[0-9.]+)&(?P<latitude>[0-9.]+)&(?P<index>[0-9]+)', 'sylvieforet.cartes.views.setPoint'),

    (r'^deleteObjects/(?P<mid>\d+)', 'sylvieforet.cartes.views.deleteObjects'),

    #(r'^lockObject/(?P<oid>\d+)/', 'sylvieforet.cartes.views.lockObject'),
    #(r'^unlockObject/(?P<oid>\d+)/', 'sylvieforet.cartes.views.unlockObject'),
    #(r'^isLocked/(?P<oid>\d+)/', 'sylvieforet.cartes.views.isLocked'),
)
