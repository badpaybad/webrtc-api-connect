var username = "<username>";
var password = "<password>";
var wss = ""
var sipEndpoint =""
var config = undefined;
var ua = undefined;
var session = undefined;

var options = undefined;
var client = undefined;
var updateCallInfoInterval = setInterval(function(){
    if(session){
        document.getElementById("session-status").innerHTML = session.status;
        
        switch (session.status) {
            case SESSION_STATUS.IDLE:{
                document.getElementById("call-status").innerHTML = "";
                document.getElementById("call-phone").innerHTML = "";
                document.getElementById("call-duration").innerHTML = "";
                document.getElementById("call-type").innerHTML = "";
                document.getElementById("call-id").innerHTML = "";
                break;
            }
            case SESSION_STATUS.ANSWERING:{
                document.getElementById("call-status").innerHTML = "đang trả lời";
                document.getElementById("call-phone").innerHTML = session.remoteIdentity.uri.normal.user;
                document.getElementById("call-duration").innerHTML = Math.floor(((new Date())-session.startTime)/1000);
                document.getElementById("call-type").innerHTML = (session.type === "inbound"?"cuộc gọi vào":"cuộc gọi ra");
                document.getElementById("call-id").innerHTML = session.id;
                break;
            }
            case SESSION_STATUS.INBOUND_RINGING:
            case SESSION_STATUS.OUTBOUND_RINGING:{
                document.getElementById("call-status").innerHTML = "đang đổ chuông";
                document.getElementById("call-phone").innerHTML = session.remoteIdentity.uri.normal.user;
                document.getElementById("call-type").innerHTML = (session.type === "inbound"?"cuộc gọi vào":"cuộc gọi ra");
                document.getElementById("call-id").innerHTML = session.id;
                break;
            }
                
        
            default:
                break;
        }
    }
},500);

const SESSION_STATUS = {
    IDLE: 9,
    OUTBOUND_STARTING: 1,
    OUTBOUND_RINGING: 2,
    INBOUND_RINGING: 4,
    ANSWERING:12
} 


function handlePageLoad() {
   config = {
        displayName: username,
        uri: `sip:${username}@${sipEndpoint}`,
        transportOptions: { wsServers: [`${wss}`] },
        authorizationUsersip: username,
        password: password,
        sessionDescriptionHandlerOptions: {
            constraints: {
                audio: true,
                video: false
            },
        }
    };

    document.getElementById("extension-username").innerHTML = username;

    ua = new SIP.UA(config);

    ua.on('connected', function () {
        document.getElementById('ua-status').innerHTML = 'Connected (Unregistered)';
        document.getElementById('ua-status').style.color = "yellow";
    });

    ua.on('registered', function () {
        document.getElementById('ua-status').innerHTML = 'Connected (Registered)';
        document.getElementById('ua-status').style.color = "green";
    });

    ua.on('unregistered', function () {
        document.getElementById('ua-status').innerHTML = 'Connected (Unregistered)';
        document.getElementById('ua-status').style.color = "red";
    });

    ua.on('error', function (error) {
        console.log("ERROR", error);
    })

    ua.on('invite', function (s) {
        session = s;
        console.log(s)
        session.type = "inbound";
        showRingingCallElements();

        session.on('accepted',function(){
            console.log("ACCEPTED");
            showAnswerCallElements();
        });
        session.on('rejected',function(){
            console.log("REJECTED");
            showIdleCallElements();
        })
        session.on('cancel',function(){
            console.log("CANCEL");
            showIdleCallElements();
        })
        session.on('failed',function(){
            console.log("FAILED");
            showIdleCallElements();
        })
        session.on('bye',function(){
            console.log("BYE");
            showIdleCallElements();
        })

        session.on('trackAdded', function() { 
            console.log("TRACK_ADDED");
            var pc = session.sessionDescriptionHandler.peerConnection; 
            var player = document.getElementById("player");
            var remoteStream = new MediaStream(); 

            pc.getReceivers().forEach(function(receiver) { 
                remoteStream.addTrack(receiver.track); 
            }); 
            if (typeof player.srcObject !== 'undefined') {
                player.srcObject = remoteStream;
            } else if (typeof player.mozSrcObject !== 'undefined') {
                player.mozSrcObject = remoteStream;
            } else if (typeof player.src !== 'undefined') {
                player.src = URL.createObjectURL(remoteStream);
            } else {
                console.log('Error attaching stream to element.');
            }
            player.play(); 
        });
    })
}

function showIdleCallElements(callType){
    document.getElementById('button-answer').style.display = "none";
    document.getElementById('button-hangup').style.display = "none";
    document.getElementById('button-transfer').style.display = "none";
    document.getElementById('input-phone-transfer').style.display = "none";
    document.getElementById('button-call').style.display = "inline";
    document.getElementById('input-phone').style.display = "inline";
}

function showAnswerCallElements(callType){
    document.getElementById('button-answer').style.display = "none";
    document.getElementById('button-hangup').style.display = "inline";
    document.getElementById('button-transfer').style.display = "inline";
    document.getElementById('input-phone-transfer').style.display = "inline";
    document.getElementById('button-call').style.display = "none";
    document.getElementById('input-phone').style.display = "none";
}
function showRingingCallElements(callType){
    document.getElementById('button-answer').style.display = "inline";
    document.getElementById('button-hangup').style.display = "none";
    document.getElementById('button-transfer').style.display = "none";
    document.getElementById('input-phone-transfer').style.display = "none";
    document.getElementById('button-call').style.display = "none";
    document.getElementById('input-phone').style.display = "none";
}

function handleButtonAnswerClick(){
    let option = {
        sessionDescriptionHandlerOptions: {
            constraints: {
                audio: true,
                video: false
            },
        }
    }
    if(
        session.status === SESSION_STATUS.INBOUND_RINGING ||
        session.status === SESSION_STATUS.OUTBOUND_RINGING
    ){
        session.accept(option);
    }
}
function handleButtonHangupClick(){
    if(
        session.status === SESSION_STATUS.ANSWERING
    ){
        session.terminate();
    }
}
function handleButtonTransferClick(){
    if(
        session.status === SESSION_STATUS.ANSWERING
    ){
        session.refer(document.getElementById("input-phone-transfer").value);
    }
}
function handleButtonCallClick(){
    let status = SESSION_STATUS.IDLE;
    if(session){
        status = session.status
    }
    if(status === SESSION_STATUS.IDLE){
        session = ua.invite(
            document.getElementById('input-phone').value,
            {
                media: {
                    constraints: {
                        audio: true,
                        video: false
                    }
                },
                sessionDescriptionHandlerOptions: {
                    constraints: {
                        audio: true,
                        video: false
                    },
                }
            }
        );
        session.type = "outbound";

        showAnswerCallElements();

        session.on('accepted',function(){
            console.log("ACCEPTED");
            showAnswerCallElements();
        });
        session.on('rejected',function(){
            console.log("REJECTED");
            showIdleCallElements();
        })
        session.on('cancel',function(){
            console.log("CANCEL");
            showIdleCallElements();
        })
        session.on('failed',function(){
            console.log("FAILED");
            showIdleCallElements();
        })
        session.on('bye',function(){
            console.log("BYE");
            showIdleCallElements();
        })

        session.on('trackAdded', function() { 
            console.log("TRACK_ADDED");
            var pc = session.sessionDescriptionHandler.peerConnection; 
            var player = document.getElementById("player");
            var remoteStream = new MediaStream(); 

            pc.getReceivers().forEach(function(receiver) { 
                remoteStream.addTrack(receiver.track); 
            }); 

            if (typeof player.srcObject !== 'undefined') {
                player.srcObject = remoteStream;
            } else if (typeof player.mozSrcObject !== 'undefined') {
                player.mozSrcObject = remoteStream;
            } else if (typeof player.src !== 'undefined') {
                player.src = URL.createObjectURL(remoteStream);
            } else {
                console.log('Error attaching stream to element.');
            }
            player.play(); 
        });
    }
}





