using System;
using System.Runtime.CompilerServices;
using System.Runtime.Serialization;
using System.Security;
using System.Security.Permissions;
using IKVM.Attributes;
using ikvm.@internal;
using IKVM.Runtime;
using java.io;
using java.lang;

namespace com.edc.classbook.model
{
	// Token: 0x02000002 RID: 2
	[Implements(new string[] { "java.io.Serializable" })]
	[Serializable]
	public class BookConfigModel : Object, Serializable.__Interface, ISerializable
	{
		// Token: 0x06000001 RID: 1 RVA: 0x00002050 File Offset: 0x00000250
		[LineNumberTable(new byte[] { 159, 171, 104, 107, 139 })]
		[MethodImpl(8)]
		public BookConfigModel()
		{
			this.bookId = "";
			this.bookName = "";
		}

		// Token: 0x06000002 RID: 2 RVA: 0x0000207C File Offset: 0x0000027C
		[LineNumberTable(new byte[]
		{
			159, 176, 104, 108, 172, 223, 9, 226, 61, 97,
			102, 167, 172, 223, 9, 226, 61, 97, 102, 167
		})]
		[MethodImpl(8)]
		public BookConfigModel(BookConfigModelEnc enc)
		{
			this.bookId = enc.getBookId();
			this.bookName = enc.getBookName();
			Exception ex3;
			try
			{
				this.contentPageIndex = Integer.parseInt(enc.getContentPageIndex());
			}
			catch (Exception ex)
			{
				Exception ex2 = ByteCodeHelper.MapException<Exception>(ex, ByteCodeHelper.MapFlags.None);
				if (ex2 == null)
				{
					throw;
				}
				ex3 = ex2;
				goto IL_0045;
			}
			goto IL_0058;
			IL_0045:
			Exception ex4 = ex3;
			Throwable.instancehelper_printStackTrace(ex4);
			this.contentPageIndex = 0;
			IL_0058:
			this.publisher = enc.getPublisher();
			Exception ex7;
			try
			{
				this.numberPages = Integer.parseInt(enc.getNumberPages());
			}
			catch (Exception ex5)
			{
				Exception ex6 = ByteCodeHelper.MapException<Exception>(ex5, ByteCodeHelper.MapFlags.None);
				if (ex6 == null)
				{
					throw;
				}
				ex7 = ex6;
				goto IL_0089;
			}
			return;
			IL_0089:
			ex4 = ex7;
			Throwable.instancehelper_printStackTrace(ex4);
			this.numberPages = 0;
		}

		// Token: 0x06000003 RID: 3 RVA: 0x00002144 File Offset: 0x00000344
		public virtual string getBookId()
		{
			return this.bookId;
		}

		// Token: 0x06000004 RID: 4 RVA: 0x0000214C File Offset: 0x0000034C
		public virtual void setBookId(string bookId)
		{
			this.bookId = bookId;
		}

		// Token: 0x06000005 RID: 5 RVA: 0x00002155 File Offset: 0x00000355
		public virtual string getBookName()
		{
			return this.bookName;
		}

		// Token: 0x06000006 RID: 6 RVA: 0x0000215D File Offset: 0x0000035D
		public virtual void setBookName(string bookName)
		{
			this.bookName = bookName;
		}

		// Token: 0x06000007 RID: 7 RVA: 0x00002166 File Offset: 0x00000366
		public virtual int getFirstPageIndex()
		{
			return this.firstPageIndex;
		}

		// Token: 0x06000008 RID: 8 RVA: 0x0000216E File Offset: 0x0000036E
		public virtual void setFirstPageIndex(int firstPageIndex)
		{
			this.firstPageIndex = firstPageIndex;
		}

		// Token: 0x06000009 RID: 9 RVA: 0x00002177 File Offset: 0x00000377
		public virtual int getContentPageIndex()
		{
			return this.contentPageIndex;
		}

		// Token: 0x0600000A RID: 10 RVA: 0x0000217F File Offset: 0x0000037F
		public virtual void setContentPageIndex(int contentPageIndex)
		{
			this.contentPageIndex = contentPageIndex;
		}

		// Token: 0x0600000B RID: 11 RVA: 0x00002188 File Offset: 0x00000388
		public virtual int getPageCountIndex()
		{
			return this.pageCountIndex;
		}

		// Token: 0x0600000C RID: 12 RVA: 0x00002190 File Offset: 0x00000390
		public virtual void setPageCountIndex(int pageCountIndex)
		{
			this.pageCountIndex = pageCountIndex;
		}

		// Token: 0x0600000D RID: 13 RVA: 0x00002199 File Offset: 0x00000399
		public virtual string getPublisher()
		{
			return this.publisher;
		}

		// Token: 0x0600000E RID: 14 RVA: 0x000021A1 File Offset: 0x000003A1
		public virtual void setPublisher(string publisher)
		{
			this.publisher = publisher;
		}

		// Token: 0x0600000F RID: 15 RVA: 0x000021AA File Offset: 0x000003AA
		public virtual void setNumberPages(int numberPages)
		{
			this.numberPages = numberPages;
		}

		// Token: 0x06000010 RID: 16 RVA: 0x000021B3 File Offset: 0x000003B3
		public virtual int getNumberPages()
		{
			return this.numberPages;
		}

		// Token: 0x06000011 RID: 17 RVA: 0x000021BC File Offset: 0x000003BC
		[HideFromJava]
		public static implicit operator Serializable(BookConfigModel A_0)
		{
			Serializable serializable;
			serializable.__<ref> = A_0;
			return serializable;
		}

		// Token: 0x06000012 RID: 18 RVA: 0x000021D8 File Offset: 0x000003D8
		[SecurityCritical]
		[HideFromJava]
		[PermissionSet(2, XML = "<PermissionSet class=\"System.Security.PermissionSet\"\r\nversion=\"1\">\r\n<IPermission class=\"System.Security.Permissions.SecurityPermission, mscorlib, Version=2.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089\"\r\nversion=\"1\"\r\nFlags=\"SerializationFormatter\"/>\r\n</PermissionSet>\r\n")]
		protected virtual void GetObjectData(SerializationInfo A_1, StreamingContext A_2)
		{
			Serialization.writeObject(this, A_1);
		}

		// Token: 0x06000013 RID: 19 RVA: 0x000021E1 File Offset: 0x000003E1
		[HideFromJava]
		[PermissionSet(2, XML = "<PermissionSet class=\"System.Security.PermissionSet\"\r\nversion=\"1\">\r\n<IPermission class=\"System.Security.Permissions.SecurityPermission, mscorlib, Version=2.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089\"\r\nversion=\"1\"\r\nFlags=\"SerializationFormatter\"/>\r\n</PermissionSet>\r\n")]
		protected BookConfigModel(SerializationInfo A_1, StreamingContext A_2)
		{
			Serialization.readObject(this, A_1);
		}

		// Token: 0x04000001 RID: 1
		private string bookId;

		// Token: 0x04000002 RID: 2
		private string bookName;

		// Token: 0x04000003 RID: 3
		private int firstPageIndex;

		// Token: 0x04000004 RID: 4
		private int contentPageIndex;

		// Token: 0x04000005 RID: 5
		private int pageCountIndex;

		// Token: 0x04000006 RID: 6
		private string publisher;

		// Token: 0x04000007 RID: 7
		private int numberPages;
	}
}
