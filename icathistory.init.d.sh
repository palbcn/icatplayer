#!/bin/bash

# icathistory server startup script
# inspired in https://www.npmjs.com/package/initd-forever
#   which in turn was based on a script posted by https://gist.github.com/jinze
# and https://github.com/chovy/node-startup

APP_NAME="icathistory"
USER="pi"
GROUP="$USER"
COMMAND="node"
FOREVER_APP="forever"
NODE_APP="/home/pi/icat/icathistory.js"
APP_ARGS="/home/pi/icat.json"
NODE_ENV="production"
PORT="32104"
PID_FILE="/var/run/icathistory.pid"
LOG_FILE="/var/run/icathistory.log"

# If you wish the Daemon to be lauched at boot / stopped at shutdown :
#
#    On Debian-based distributions:
#      INSTALL : update-rc.d scriptname defaults
#      (UNINSTALL : update-rc.d -f  scriptname remove)
#
#    On RedHat-based distributions (CentOS, OpenSUSE...):
#      INSTALL : chkconfig --level 35 scriptname on
#      (UNINSTALL : chkconfig --level 35 scriptname off)
#
#
# REDHAT chkconfig header ####################################
### BEGIN INIT INFO
# chkconfig:         2345 90 60
# Provides:          icathistory
# Required-Start:    $network $remote_fs $local_fs $syslog
# Required-Stop:     $network $remote_fs $local_fs $syslog
# Default-Start:     2 3 4 5
# Default-Stop:      0 1 6
# Short-Description: forever running icathistory.js
# Description:       forever running icathistory.js
### END INIT INFO


if [ "$(id -u)" != "0" ]; then
   echo "This script must be run as root" 1>&2
   exit 1
fi;


if [ -e /lib/lsb/init-functions ]; then
        # LSB source function library.
        . /lib/lsb/init-functions
fi;

start() {
   echo "Starting $APP_NAME"

   # Notice that we change the PATH because on reboot
   # the PATH does not include the path to node.
   # Launching forever with a full path
   # does not work unless we set the PATH.
   PATH=/usr/local/bin:$PATH
   export NODE_ENV=$NODE_ENV
   export PORT=$PORT
   $FOREVER_APP start --pidFile $PID_FILE -l $LOG_FILE -a -d -c $COMMAND $NODE_APP $APP_ARGS
   RETVAL=$?
}

restart() {
   echo -n "Restarting $APP_NAME"
   $FOREVER_APP restart $NODE_APP
   RETVAL=$?
}

stop() {
   echo -n "Shutting down $APP_NAME"
   $FOREVER_APP stop $NODE_APP
   RETVAL=$?
}

status() {
   echo -n "Status $APP_NAME"
   $FOREVER_APP list
   RETVAL=$?
}

case "$1" in
   start)
        start
        ;;
   stop)
        stop
        ;;
   status)
        status
        ;;
   restart)
        restart
        ;;
   *)
        echo "Usage:  {start|stop|status|restart}"
        exit 1
        ;;
esac
exit $RETVAL
