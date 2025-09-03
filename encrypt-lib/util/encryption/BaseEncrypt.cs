using System;
using System.Runtime.CompilerServices;
using IKVM.Attributes;
using java.lang;
using javax.crypto;

namespace com.edc.classbook.util.encryption
{
	// Token: 0x02000060 RID: 96
	public abstract class BaseEncrypt : Object
	{
		// Token: 0x06000345 RID: 837 RVA: 0x00011B46 File Offset: 0x0000FD46
		[LineNumberTable(7)]
		[MethodImpl(8)]
		public BaseEncrypt()
		{
		}

		// Token: 0x06000346 RID: 838
		[Throws(new string[] { "java.security.NoSuchAlgorithmException" })]
		public abstract SecretKey generateKeyFromString(string str);

		// Token: 0x06000347 RID: 839
		[Throws(new string[] { "java.lang.Exception" })]
		public abstract string encryptString(string str1, string str2);

		// Token: 0x06000348 RID: 840
		[Throws(new string[] { "java.lang.Exception" })]
		public abstract string decryptString(string str1, string str2);
	}
}
