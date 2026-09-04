let {MongoClient,ObjectId}=require("mongodb");
let url=process.env.MONGO_URL;

let getPost=(res)=>
{
    let client = new MongoCLient(url);
    client.connect()
    let db = client.db("Swish");
    let collec = db.collection("posts");
    collec.find().toArray()
    .then((result)=>res.send(result))
    .catch((err)=>res.send(err))
    .finally(()=>client.close());
}

let createPost=(data,res)=>
{
    let client = new MongoClient(url);
    client.connect()
    let db = client.db("Swish");
    let collec = db.collection("posts");
    collec.insertOne(data)
    .then((result)=>res.send(result))
    .catch((err)=>res.send(err))
    .finally(()=>client.close());
}

let deletePost=(id,res)=>
{
    let client = new MongoClient(url);
    client.connect()
    let db = client.db("Swish");
    let collec = db.collection("posts");
    collec.deleteOne({_id:new ObjectId(id)})
    .then((result)=>res.send(result))
    .catch((err)=>res.send(err))
    .finally(()=>client.close());
}

module.exports={getPost,createPost,deletePost};