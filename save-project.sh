#!/bin/bash

function save-project-to-repo() {
    git remote rm origin
    git remote add origin $1
    git push
}

declare readonly gitRemotes=(
    git@bitbucket.org:pH_7/pierrehenry.be.git
    git@gitlab.com:pH-7/pierrehenry.be.git
    git@github.com:HiDeaUp/PierreHenry.be.git
)
for remote in "${gitRemotes[@]}"
do
    save-project-to-repo $remote
done
