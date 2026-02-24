DROP TRIGGER IF EXISTS "song_publish_benefit_trigger" ON "public"."songs";

CREATE TRIGGER "song_publish_benefit_trigger"
AFTER INSERT OR UPDATE ON "public"."songs"
FOR EACH ROW
EXECUTE FUNCTION "public"."add_song_publish_benefit"();