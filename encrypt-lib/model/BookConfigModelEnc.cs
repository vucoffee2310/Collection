using System;
using System.Runtime.CompilerServices;
using System.Runtime.Serialization;
using System.Security;
using System.Security.Permissions;
using IKVM.Attributes;
using ikvm.@internal;
using java.io;
using java.lang;

namespace com.edc.classbook.model
{
	// Token: 0x02000003 RID: 3
	[Implements(new string[] { "java.io.Serializable" })]
	[Serializable]
	public class BookConfigModelEnc : Object, Serializable.__Interface, ISerializable
	{
		// Token: 0x06000014 RID: 20 RVA: 0x000021F0 File Offset: 0x000003F0
		public virtual string getBookId()
		{
			return this.bookId;
		}

		// Token: 0x06000015 RID: 21 RVA: 0x000021F8 File Offset: 0x000003F8
		public virtual string getBookName()
		{
			return this.bookName;
		}

		// Token: 0x06000016 RID: 22 RVA: 0x00002200 File Offset: 0x00000400
		public virtual string getContentPageIndex()
		{
			return this.contentPageIndex;
		}

		// Token: 0x06000017 RID: 23 RVA: 0x00002208 File Offset: 0x00000408
		public virtual string getPublisher()
		{
			return this.publisher;
		}

		// Token: 0x06000018 RID: 24 RVA: 0x00002210 File Offset: 0x00000410
		public virtual string getNumberPages()
		{
			return this.numberPages;
		}

		// Token: 0x06000019 RID: 25 RVA: 0x00002218 File Offset: 0x00000418
		[LineNumberTable(13)]
		[MethodImpl(8)]
		public BookConfigModelEnc()
		{
		}

		// Token: 0x0600001A RID: 26 RVA: 0x00002222 File Offset: 0x00000422
		public virtual void setBookId(string bookId)
		{
			this.bookId = bookId;
		}

		// Token: 0x0600001B RID: 27 RVA: 0x0000222B File Offset: 0x0000042B
		public virtual void setBookName(string bookName)
		{
			this.bookName = bookName;
		}

		// Token: 0x0600001C RID: 28 RVA: 0x00002234 File Offset: 0x00000434
		public virtual string getFirstPageIndex()
		{
			return this.firstPageIndex;
		}

		// Token: 0x0600001D RID: 29 RVA: 0x0000223C File Offset: 0x0000043C
		public virtual void setFirstPageIndex(string firstPageIndex)
		{
			this.firstPageIndex = firstPageIndex;
		}

		// Token: 0x0600001E RID: 30 RVA: 0x00002245 File Offset: 0x00000445
		public virtual void setContentPageIndex(string contentPageIndex)
		{
			this.contentPageIndex = contentPageIndex;
		}

		// Token: 0x0600001F RID: 31 RVA: 0x0000224E File Offset: 0x0000044E
		public virtual string getPageCountIndex()
		{
			return this.pageCountIndex;
		}

		// Token: 0x06000020 RID: 32 RVA: 0x00002256 File Offset: 0x00000456
		public virtual void setPageCountIndex(string pageCountIndex)
		{
			this.pageCountIndex = pageCountIndex;
		}

		// Token: 0x06000021 RID: 33 RVA: 0x0000225F File Offset: 0x0000045F
		public virtual void setPublisher(string publisher)
		{
			this.publisher = publisher;
		}

		// Token: 0x06000022 RID: 34 RVA: 0x00002268 File Offset: 0x00000468
		public virtual void setNumberPages(string numberPages)
		{
			this.numberPages = numberPages;
		}

		// Token: 0x06000023 RID: 35 RVA: 0x00002274 File Offset: 0x00000474
		[HideFromJava]
		public static implicit operator Serializable(BookConfigModelEnc A_0)
		{
			Serializable serializable;
			serializable.__<ref> = A_0;
			return serializable;
		}

		// Token: 0x06000024 RID: 36 RVA: 0x00002290 File Offset: 0x00000490
		[SecurityCritical]
		[HideFromJava]
		[PermissionSet(2, XML = "<PermissionSet class=\"System.Security.PermissionSet\"\r\nversion=\"1\">\r\n<IPermission class=\"System.Security.Permissions.SecurityPermission, mscorlib, Version=2.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089\"\r\nversion=\"1\"\r\nFlags=\"SerializationFormatter\"/>\r\n</PermissionSet>\r\n")]
		protected virtual void GetObjectData(SerializationInfo A_1, StreamingContext A_2)
		{
			Serialization.writeObject(this, A_1);
		}

		// Token: 0x06000025 RID: 37 RVA: 0x00002299 File Offset: 0x00000499
		[HideFromJava]
		[PermissionSet(2, XML = "<PermissionSet class=\"System.Security.PermissionSet\"\r\nversion=\"1\">\r\n<IPermission class=\"System.Security.Permissions.SecurityPermission, mscorlib, Version=2.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089\"\r\nversion=\"1\"\r\nFlags=\"SerializationFormatter\"/>\r\n</PermissionSet>\r\n")]
		protected BookConfigModelEnc(SerializationInfo A_1, StreamingContext A_2)
		{
			Serialization.readObject(this, A_1);
		}

		// Token: 0x04000008 RID: 8
		private string bookId;

		// Token: 0x04000009 RID: 9
		private string bookName;

		// Token: 0x0400000A RID: 10
		private string firstPageIndex;

		// Token: 0x0400000B RID: 11
		private string contentPageIndex;

		// Token: 0x0400000C RID: 12
		private string pageCountIndex;

		// Token: 0x0400000D RID: 13
		private string publisher;

		// Token: 0x0400000E RID: 14
		private string numberPages;
	}
}
