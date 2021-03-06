require("requirish")._(module);
var _ = require("underscore");
var should = require("should");
var server_engine = require("lib/server/server_engine");

var resolveNodeId = require("lib/datamodel/nodeid").resolveNodeId;
var DataValue = require("lib/datamodel/datavalue").DataValue;
var Variant = require("lib/datamodel/variant").Variant;
var VariantArrayType = require("lib/datamodel/variant").VariantArrayType;
var DataType = require("lib/datamodel/variant").DataType;
var NodeId = require("lib/datamodel/nodeid").NodeId;
var StatusCodes = require("lib/datamodel/opcua_status_code").StatusCodes;

var engine, FolderTypeId, BaseDataVariableTypeId, ref_Organizes_Id;

var getMethodDeclaration_ArgumentList = require("lib/datamodel/argument_list").getMethodDeclaration_ArgumentList;
var Method = require("lib/address_space/method").Method;

var translate_service = require("lib/services/translate_browse_paths_to_node_ids_service");

describe("ServerEngine - addMethod", function () {

    before(function (done) {

        engine = new server_engine.ServerEngine();

        engine.initialize(null, function () {

            FolderTypeId = engine.address_space.findObjectType("FolderType").nodeId;
            BaseDataVariableTypeId = engine.address_space.findVariableType("BaseDataVariableType").nodeId;
            ref_Organizes_Id = engine.address_space.findReferenceType("Organizes").nodeId;
            ref_Organizes_Id.toString().should.eql("ns=0;i=35");

            done();
        });

    });
    after(function () {
        engine.shutdown();
        engine = null;
    });

    it("should be able to attach a method on a object of the address space and call it",function(done) {


        var object = engine.addObjectInFolder( engine.findObject("ObjectsFolder"),{
            browseName: "MyObject",
            nodeId: "ns=1;s=MyObject"
        });


        var method = engine.addMethod(object,{
            browseName: "Bark",

            inputArguments:  [
                {
                name:"nbBarks",
                description: { text: "specifies the number of time I should bark" },
                dataType: DataType.UInt32
                }
            ],

            outputArguments: [
                {
                    name:"Barks",
                    description:{ text: "the generated barks" },
                    dataType: DataType.String ,
                    valueRank: 1

                }
            ]
        });

        method.should.be.instanceOf(Method);

        method.nodeId.should.be.instanceOf(NodeId);
        var objectMethod = object.getMethodById(method.nodeId);
        _.isObject(objectMethod).should.eql(true);

        var arg = getMethodDeclaration_ArgumentList(engine.address_space,object.nodeId,method.nodeId);

        arg.statusCode.should.eql(StatusCodes.Good);
        arg.methodDeclaration.should.eql(objectMethod);

        var methodInputArguments = objectMethod.getInputArguments();
        _.isArray(methodInputArguments).should.eql(true);

        var methodOutputArguments = objectMethod.getOutputArguments();
        _.isArray(methodOutputArguments).should.eql(true);

        engine.bindMethod(method.nodeId,function(inputArguments,context,callback) {

            var nbBarks = inputArguments[0].value;
            console.log("Hello World ! I will bark ",nbBarks,"times");
            var barks = []; for(var i=0;i<nbBarks;i++){ barks.push("Whaff");}
            var callMethodResult = {
                statusCode: StatusCodes.Good,
                outputArguments: [
                    {
                        dataType: DataType.String,
                        arrayType: VariantArrayType.Array,
                        value :barks
                    }
                ]
            };
            callback(null,callMethodResult);
        });
        // now call it
        var inputArguments = [{ dataType: DataType.UInt32, value: 3}];
        var context = {};



        // it should be possible to find the InputArguments and OutputArguments property
        // using translate browse path

        var hasPropertyRefId = resolveNodeId("HasProperty");/* NodeId  ns=0;i=46*/
        var browsePath = [{
            startingNode: /* NodeId  */ method.nodeId,
            relativePath: /* RelativePath   */  {
                elements: /* RelativePathElement */ [
                    {
                        referenceTypeId: hasPropertyRefId,
                        isInverse: false,
                        includeSubtypes: false,
                        targetName: { namespaceIndex: 0, name: "InputArguments" }
                    }
                ]
            }
        }, {
            startingNode: method.nodeId,
            relativePath: {
                elements: [
                    {
                        referenceTypeId: hasPropertyRefId,
                        isInverse: false,
                        includeSubtypes: false,
                        targetName: {   name: "OutputArguments" }
                    }
                ]
            }
        }
        ];

        var result = engine.browsePath(new translate_service.BrowsePath(browsePath[0]));
        result.statusCode.should.eql(StatusCodes.Good);

        result = engine.browsePath(new translate_service.BrowsePath(browsePath[1]));
        result.statusCode.should.eql(StatusCodes.Good);

        objectMethod.execute(inputArguments,context,function(err,callMethodResponse) {

            done(err);
            callMethodResponse.statusCode.should.eql(StatusCodes.Good);
            callMethodResponse.outputArguments.length.should.eql(1);
            callMethodResponse.outputArguments[0].value.should.eql(["Whaff","Whaff","Whaff"]);
            console.log(" Result = ",callMethodResponse.outputArguments[0].value);
        });

    });

});
