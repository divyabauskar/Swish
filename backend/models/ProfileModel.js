let { MongoClient, ObjectId } = require("mongodb");
let url=process.env.MONGO_URL;

let getProfile=(res)=>
{
    let client = new MongoClient(url);
    client.connect()
    let db = client.db("Swish");
    let collec = db.collection("events");
    collec.findOne()
    .then((result)=>res.send(result))
    .catch((err)=>res.send(err))
    .finally(()=>client.close());
}

let updateProfile=(id,data,res)=>
{
     let client = new MongoClient(url);
    client.connect()
    let db = client.db("Swish");
    let collec = db.collection("events");
    collec.findOneAndUpdate({_id:new ObjectId(id)},{$set:data})
    .then((result)=>res.send(result))
    .catch((err)=>res.send(err))
    .finally(()=>client.close());
}

module.exports={getProfile,updateProfile};