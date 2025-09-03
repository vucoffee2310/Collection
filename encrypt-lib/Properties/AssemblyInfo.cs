using System;
using System.Reflection;
using IKVM.Attributes;

[assembly: AssemblyAlgorithmId(0)]
[assembly: AssemblyVersion("0.0.0.0")]
[module: SourceFile(null)]
[module: JavaModule(Jars = new string[] { "encrypt-lib.jar" })]
[module: PackageList(new string[] { "com.edc.classbook.model", "com.edc.classbook.util.codec", "com.edc.classbook.util.codec.binary", "com.edc.classbook.util.codec.digest", "com.edc.classbook.util.codec.language", "com.edc.classbook.util.codec.language.bm", "com.edc.classbook.util.codec.net", "com.edc.classbook.util.encryption", "com.edc.classbook.util.serializabledb" })]
