from django.contrib import admin
from django.contrib.auth.models import User
from django.contrib.auth.admin import UserAdmin
from sylvieforet.cartes.models import Map
from sylvieforet.cartes.models import Object
from sylvieforet.cartes.models import Point
from sylvieforet.cartes.models import SylvieUser
from sylvieforet.cartes.models import Share

#admin.site.unregister(User)
 
#class SylvieUserInline(admin.StackedInline):
#    model = SylvieUser
 
class SylvieUserAdmin(admin.ModelAdmin):
    pass
 
admin.site.register(SylvieUser, SylvieUserAdmin)

class MapAdmin(admin.ModelAdmin):
    pass

admin.site.register(Map, MapAdmin)

class ObjectAdmin(admin.ModelAdmin):
    pass

admin.site.register(Object, ObjectAdmin)

class PointAdmin(admin.ModelAdmin):
    pass

admin.site.register(Point, PointAdmin)

class ShareAdmin(admin.ModelAdmin):
    pass

admin.site.register(Share, ShareAdmin)
