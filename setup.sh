#!/bin/bash
#
# Script to setup a virtual environment with pip for Django and associated plugins

function abspath {
	if [[ -d "$1" ]]
	then
		pushd "$1" >/dev/null
		pwd
		popd >/dev/null
	elif [[ -e $1 ]]
	then
		pushd $(dirname $1) >/dev/null
		echo $(pwd)/$(basename $1)
		popd >/dev/null
	else
		echo $1 does not exist! >&2
		return 127
	fi
}


# Remove old compiled files
find . -name '*.pyc' | xargs -I{} rm -rf {}

ARGS=$@
APPS_DIR='apps'

CURR_REL_DIR=$(dirname $0)

CURR_DIR=$(abspath "${CURR_REL_DIR}")

virtualenv --no-site-packages $CURR_DIR

SRC_DIR="${CURR_DIR}/src"

if [ ! -d "${SRC_DIR}" ]; then
   mkdir "${SRC_DIR}"
fi

"$CURR_DIR/bin/easy_install" "setuptools==15.2"
"$CURR_DIR/bin/easy_install" "pip==6.1.1"

"$CURR_DIR/bin/pip" install -r "$CURR_DIR/requirements.txt" $ARGS

if [ ! -d "${CURR_DIR}/assets" ]; then
	mkdir "$CURR_DIR/assets"
	mkdir "$CURR_DIR/assets/media"
	mkdir "$CURR_DIR/assets/media/files"
	mkdir "$CURR_DIR/assets/media/img"
	mkdir "$CURR_DIR/assets/static"
fi

echo "from .base import *" > $CURR_DIR/apps/wysiwyg_admin/settings/local.py
