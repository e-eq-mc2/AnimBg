git add -u
git ci -m "Add fps option"
git push

tag=0.5.5
git tag | xargs git tag -d
git ls-remote --tags 2>&1| tail -n +2 | cut -f 2 | cut -d'/' -f 3 | xargs git push origin --delete
git tag $tag
git push origin $tag
