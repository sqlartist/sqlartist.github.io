# Drop a Medium export here

Medium's feed only sends the opening of member-only stories, so the daily sync
keeps those as hidden drafts until the full text arrives. To fill them in:

1. On Medium, go to **Settings → Security and apps → Download your information**
   and wait for the email with the zip file.
2. Here on GitHub, open this `imports` folder, click **Add file → Upload files**,
   drop the zip in and click **Commit changes**.

The "Import Medium export" action then adds the full text, publishes those
stories, copies their pictures to the blog, removes the zip and republishes the
site. Stories you have already edited on the blog are left alone.
