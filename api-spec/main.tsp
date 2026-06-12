import "@typespec/http";

using Http;


model PostLog {
    sessionId: string;
    tagName: string[];
}

@route("/postLog")
@post
op createPostLog(@body body: PostLog) :PostLog;
