using System;
using System.Runtime.CompilerServices;
using System.Runtime.Serialization;
using System.Security.Permissions;
using IKVM.Attributes;
using java.lang;

namespace com.edc.classbook.util.codec
{
	// Token: 0x0200000E RID: 14
	[Serializable]
	public class DecoderException : Exception
	{
		// Token: 0x0600009F RID: 159 RVA: 0x00002CA1 File Offset: 0x00000EA1
		[LineNumberTable(new byte[] { 159, 184, 104 })]
		[MethodImpl(8)]
		public DecoderException()
		{
		}

		// Token: 0x060000A0 RID: 160 RVA: 0x00002CAB File Offset: 0x00000EAB
		[LineNumberTable(new byte[] { 3, 105 })]
		[MethodImpl(8)]
		public DecoderException(string message)
			: base(message)
		{
		}

		// Token: 0x060000A1 RID: 161 RVA: 0x00002CB6 File Offset: 0x00000EB6
		[LineNumberTable(new byte[] { 20, 106 })]
		[MethodImpl(8)]
		public DecoderException(string message, Exception cause)
			: base(message, cause)
		{
		}

		// Token: 0x060000A2 RID: 162 RVA: 0x00002CC2 File Offset: 0x00000EC2
		[LineNumberTable(new byte[] { 34, 105 })]
		[MethodImpl(8)]
		public DecoderException(Exception cause)
			: base(cause)
		{
		}

		// Token: 0x060000A3 RID: 163 RVA: 0x00002CCD File Offset: 0x00000ECD
		[HideFromJava]
		[PermissionSet(2, XML = "<PermissionSet class=\"System.Security.PermissionSet\"\r\nversion=\"1\">\r\n<IPermission class=\"System.Security.Permissions.SecurityPermission, mscorlib, Version=2.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089\"\r\nversion=\"1\"\r\nFlags=\"SerializationFormatter\"/>\r\n</PermissionSet>\r\n")]
		protected DecoderException(SerializationInfo A_1, StreamingContext A_2)
			: base(A_1, A_2)
		{
		}

		// Token: 0x04000041 RID: 65
		private const long serialVersionUID = 1L;
	}
}
