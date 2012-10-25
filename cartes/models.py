from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save

class Map(models.Model):
    mid = models.AutoField(primary_key=True)
    description = models.TextField()
    name = models.CharField(max_length=256)
    def __unicode__(self):
        return "Map_"+str(self.mid)+": "+str(self.name)+"/"+str(self.description)

class Object(models.Model):
    oid = models.AutoField(primary_key=True)
    name = models.CharField(max_length=256)
    category = models.CharField(max_length=10)
    mid = models.ForeignKey(Map)
    lock = models.BooleanField()
    def __unicode__(self):
        return "Object_"+str(self.oid)+": "+str(self.mid)+"/"+str(self.name)+"/"+str(self.category)+"/"+str(self.lock)

class Point(models.Model):
    pid = models.AutoField(primary_key=True)
    longitude = models.FloatField()
    latitude = models.FloatField()
    name = models.CharField(max_length=256)
    description = models.TextField()
    index = models.IntegerField()
    oid = models.ForeignKey(Object)
    def __unicode__(self):
        return "Point_"+str(self.pid)+": "+str(self.name)+"/"+str(self.description)+"/"+str(self.oid)+"/"+str(self.longitude)+"/"+str(self.latitude)+"/"+str(self.index)

class SylvieUser(models.Model):
    user = models.ForeignKey(User, unique=True)
    mids = models.ManyToManyField(Map, through='Share')
    sig = models.IntegerField()
    def __unicode__(self):
        return "SylvieUser_"+self.user.username

User.profile = property(lambda u: SylvieUser.objects.get_or_create(user=u)[0])

class Share(models.Model):
    sid = models.AutoField(primary_key=True)
    mid = models.ForeignKey(Map)
    suid = models.ForeignKey(SylvieUser)
    date = models.DateTimeField(auto_now=True)
    def __unicode__(self):
        return "Share_"+str(self.sid)+": "+str(self.mid)+"/"+str(self.suid)
