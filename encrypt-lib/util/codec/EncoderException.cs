using System;
using System.Runtime.CompilerServices;
using System.Runtime.Serialization;
using System.Security.Permissions;
using IKVM.Attributes;
using java.lang;

namespace com.edc.classbook.util.codec
{
	// Token: 0x02000010 RID: 16
	[Serializable]
	public class EncoderException : Exception
	{
		// Token: 0x060000A5 RID: 165 RVA: 0x00002CD7 File Offset: 0x00000ED7
		[LineNumberTable(new byte[] { 159, 185, 104 })]
		[MethodImpl(8)]
		public EncoderException()
		{
		}

		// Token: 0x060000A6 RID: 166 RVA: 0x00002CE1 File Offset: 0x00000EE1
		[LineNumberTable(new byte[] { 4, 105 })]
		[MethodImpl(8)]
		public EncoderException(string message)
			: base(message)
		{
		}

		// Token: 0x060000A7 RID: 167 RVA: 0x00002CEC File Offset: 0x00000EEC
		[LineNumberTable(new byte[] { 23, 106 })]
		[MethodImpl(8)]
		public EncoderException(string message, Exception cause)
			: base(message, cause)
		{
		}

		// Token: 0x060000A8 RID: 168 RVA: 0x00002CF8 File Offset: 0x00000EF8
		[LineNumberTable(new byte[] { 37, 105 })]
		[MethodImpl(8)]
		public EncoderException(Exception cause)
			: base(cause)
		{
		}

		// Token: 0x060000A9 RID: 169 RVA: 0x00002D03 File Offset: 0x00000F03
		[HideFromJava]
		[PermissionSet(2, XML = "<PermissionSet class=\"System.Security.PermissionSet\"\r\nversion=\"1\">\r\n<IPermission class=\"System.Security.Permissions.SecurityPermission, mscorlib, Version=2.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089\"\r\nversion=\"1\"\r\nFlags=\"SerializationFormatter\"/>\r\n</PermissionSet>\r\n")]
		protected EncoderException(SerializationInfo A_1, StreamingContext A_2)
			: base(A_1, A_2)
		{
		}

		// Token: 0x04000042 RID: 66
		private const long serialVersionUID = 1L;
	}
}
