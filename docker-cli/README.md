# ucdlib/video-converter-cli

Run video conversion service in docker container.  Creates streaming folder and .ttl file.

## Example usage:

From the same directory as the image is located run:

```bash
docker run --rm -v $(pwd):/storage ucdlib/video-converter-cli bash -c "./convert.sh /storage/myfile.mp4"
```

Notes:
 - The `/storage` directory is recommend but not required.  Any linux non-root folder name can be used, just needs to be consistant with the volumn mount and the first argument of `convert.sh`.
 - replace `myfile.mp4` with your video filename
 - For the example above, a folder will be created called `myfile-stream` containing all streaming video parts.  A file will be created called `myfile-stream.ttl` with:
   - `ucdlib:clientMediaDownload` and `schema:encodesCreativeWork` links pointing at the original video file
   - `schema:contentUrl` pointing at the `myfile-stream/playlist.m3u8` file.
 - The script will not run if the folder exists.  This is a safety so you don't accidentally re-run.